/*
 * GLOBAL variables
 */
 
//config variables
var debug = false;
var logging = true;

var url = "http://dbpedia.org/sparql";

//This query return all musical genre's name and dbpedia link. Last line ensure that each returned genre has at least 1 artist/band
var stringQueryGenre = "\
    PREFIX dbpprop: <http://dbpedia.org/property/>\
    SELECT DISTINCT ?name ?sub\
    WHERE {\
        ?sub a <http://dbpedia.org/ontology/MusicGenre> .\
        ?sub dbpprop:name ?name .\
		?art dbpedia-owl:genre ?sub\
    }";

//This query return all musical bands/artists' name, wikipage link, description, image and dbpedia link related to thec chosen genre 
var stringQueryBand = "\
    PREFIX dbpprop: <http://dbpedia.org/property/>\
    PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>\
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
    SELECT ?name ?page ?desc ?sub ?img\
    WHERE {\
        ?sub dbpprop:name ?name .\
        ?sub foaf:isPrimaryTopicOf ?page .\
        ?sub dbpedia-owl:abstract ?desc .\
        ?sub dbpedia-owl:genre <@genre> .\
        ?sub a <http://dbpedia.org/ontology/Band> .\
		OPTIONAL { ?sub dbpedia-owl:thumbnail ?img } .\
		FILTER (lang(?desc) = 'en')\
    }";

//This query return all title's name, release date and album's name related to the chosen band/artist
var stringQueryTitle = "\
	PREFIX dbpprop: <http://dbpedia.org/property/>\
    PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>\
    SELECT DISTINCT ?name ?date ?albumname\
    WHERE {\
        ?title dbpedia-owl:musicalArtist <@band> .\
        ?title a <http://dbpedia.org/ontology/MusicalWork> .\
        ?title dbpprop:name ?name .\
        ?title dbpedia-owl:releaseDate ?date .\
        ?title dbpedia-owl:album ?album .\
        ?album dbpprop:name ?albumname\
    }";

//Keep current bands/artists name for reference after titles query
var clickedBandName;
//Data variable, keeping current bands/artists info in case of display
var currentBandInfo;

/*
 * ONLOAD functions
 */

$(document).ready(function() {
	
	log("debug", "document ready start");
	//Concern Logs
	if (logging)
		$("#logButton").toggleClass("hidden");
	$("#logButton").on("click", function () {
		$("#log").toggleClass("hidden");
	});
	
	//"Scroll to Top" button script part
	//credit : http://www.paulund.co.uk/how-to-create-an-animated-scroll-to-top-with-jquery
	$(window).scroll(function(){
		if ($(this).scrollTop() > 100) {
			$('.scrollToTop').fadeIn();
		} else {
			$('.scrollToTop').fadeOut();
		}
	});
	$('.scrollToTop').click(function(){
		$('html, body').animate({scrollTop : 0},800);
		return false;
	});
	
	$("#submitButton").on("click", queryBands);
	
	//Requesting dbpedia for all musical genres to enable the search by genre
	queryGenres();
	
	log("debug", "document ready end");
});

/*
 * QUERY functions, calling to query data on dbpedia
 * These fonctions prepare the query, and the sparqlCall function send it
 */
 
//Simple ajax call to the url global var, sending the query param and specifying the successful return function
function sparqlCall(query, callbackFunction) {
	log("debug", "Ajax call for sparql query");
	$.ajax({
		dataType: "json",
		url: query,
		success: callbackFunction,
		error: function (xhr, ajaxOptions, thrownError) {
			log("danger", xhr.status + " - " + thrownError);
		}
	});
}

//All queryXXX function are call right after user action or on load. 

function queryGenres() {
	log("debug", "queryGenres start - call for requesting all musical genres");
	var queryUrl = encodeURI(url + "?query=" + stringQueryGenre + "&format=json");
	sparqlCall(queryUrl, callbackGenres);
}
 
 function queryBands() {
 
	log("debug", "queryBands start - call for requesting all related music bands/artists");
    var genre = $("#genre").val();
	if (genre) {
		log("info", "Requesting queryBands for "+genre);
		
		$('#result').addClass("hidden");
		$('#waiting').html("Please wait... Query about : "+genre);
		$('#waiting').removeClass("hidden");
		
		var queryUrl = encodeURI(url + "?query=" + populateQuery(stringQueryBand, "genre", genre) + "&format=json");
		sparqlCall(queryUrl, callbackBands);
	} else {
		log("debug", "Empty or bugged selected genre : '"+genre+"'");
		//Reset the result display in case the empty option is selected
		$('#result').html("");
	}
}
 
 function queryTitles() {
	log("debug", "queryTitles start - call for requesting all related music tiltes");
	//clickedBandName is keep in memory for the callback function
	clickedBandName = $(this).text();
	log("debug", "clickedBandName = '"+clickedBandName+"'");
    var band = currentBandInfo[clickedBandName].dbpediaLink;
	if (band) {
		log("info", "Requesting related titles for " + band);
		var queryUrl = encodeURI(url + "?query=" + populateQuery(stringQueryTitle, "band", band) + "&format=json");
		sparqlCall(queryUrl, callbackBandInfo);
	} else {
		log("danger", "Error on selected band : "+clickedBandName);
	}
}

/*
 * CALLBACK functions, call after sparql queries on dbpedia
 * these function take the result of the queries and format to be easy to display
 */

function callbackGenres(data) {
	log("debug", "callbackGenres start - format genre data");
	var genres = [];
	var genresDesc = [];
	var displayMsg = "";
	log("success", "Successful genre query");
	var results = data.results.bindings;
	var num = results.length;
	log(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		genres.push(results[i].name.value);
		genresDesc[results[i].name.value] = results[i].sub.value;
	}
	
	genres.sort();
	setGenreOptions(genres, genresDesc);
	$('#genre').prop('disabled', false);
}

function callbackBands(data) {
	log("debug", "callbackBands start - format band data");
	var bands = [];
	currentBandInfo = [];
	log("success", "Successful bands query");
	var results = data.results.bindings;
	var num = results.length;
	log(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		bands.push(results[i].name.value);
		//currentBandInfos serve to keep artist/band infos so there is no need to request each time for single display
		currentBandInfo[results[i].name.value] = {wiki : results[i].page.value, desc : results[i].desc.value, dbpediaLink : results[i].sub.value, image : (results[i].img ? results[i].img.value : undefined)};
	}
	bands.sort();

	var genreName = $('#genre option:selected').text();
	setBandTable(genreName, bands);
}

function callbackBandInfo(data) {
	log("debug", "callbackBandInfo start - format title data");
	var titles = [];
	log("success", "Successful titles query");
	var results = data.results.bindings;
	var num = results.length;
	log(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		titles.push({title : results[i].name.value, album : results[i].albumname.value, date : results[i].date.value});
		
	}
	
	setBandModal(clickedBandName, titles);
}

/*
 * DISPLAY functions
 * These functions serve to generate the html code to display the results (or logs)
 */

function log(level, msg) {
	if ((logging && debug) || (logging && level!="debug")) {
		var variation = (/info|warning|danger|success/.test(level) ? level : "default")
		$('#logTable').append(
			"<tr class='"+variation+"'>"+
				"<td>" + new Date().toLocaleTimeString() +"</td>"+
				"<td><span class='label label-"+variation+"'>"+level.capitalize()+"</span> - " + msg+"</td>"+
			"</tr>"
		);
	}
}

function setGenreOptions(array, urlArray) {
    var options = "<option />";
    for (var i in array)
		options += "<option value=\"" + urlArray[array[i]] + "\">" + array[i] + "</option>";
    $('#genre').html(options);
}

function setBandTable(genreName, bands) {
	var displayTable = "";
	if (bands.length > 0) {
		displayTable += 
				"<tr>"+
					"<th>Band's name</th>"+
				"</tr>";
		for (var i in bands) {
			displayTable += 
				"<tr>"+
					"<td class='clickableBand'>" + bands[i] + "</td>"+
				"</tr>";
		}
		$(".resultOk").removeClass("hidden");
	} else {
		displayTable += "<tr><td>There's no results for this genre.</td></tr>";
		$(".resultOk").addClass("hidden");
	}
	
	
	$("#genreName").text(genreName);
	$("#bandNumber").text(bands.length);
    $("#result").find("table").html(displayTable);
	
	$(".clickableBand").on("click", queryTitles);
	
	$("#waiting").addClass("hidden");
    $("#result").removeClass("hidden");
}

function setBandModal(name, musics) {

	var image = currentBandInfo[name].image;
	var imageDisplay;
	if (image) {
		imageDisplay = "<img src='"+image+"' alt='A image of the artist/band "+name+"' class='thumbnail'>";
	} else {
		imageDisplay = "";
	}
	
	var wiki = currentBandInfo[name].wiki;
	var wikiDisplay = "<a href='"+wiki+"' target='_blank'>"+name+"'s page</a>";
	
	var desc = currentBandInfo[name].desc;
	var descDisplay = "<p>"+desc+"</p>";
	
	var titleDisplay = "";
	if (musics.length > 0) {
		titleDisplay += "<table class='table table-bordered table-hover'>"+
			"<tr>"+
				"<th>Title's name</th>"+
				"<th>Title's album</th>"+
				"<th>Title release date</th>"+
			"</tr>";
		for (var i in musics) {
			titleDisplay += 
			"<tr>"+
				"<td>"+musics[i].title+"</td>"+
				"<td>"+musics[i].album+"</td>"+
				"<td>"+new Date(musics[i].date.split("+")[0]).toLocaleDateString()+"</td>"+
			"</tr>";
		}
		titleDisplay += "</table>";
	} else {
		titleDisplay += "<p>There is not title referenced for this artist</p>"
	}
	
	var modal = $("#bandModal");
	
	modal.find(".modal-title").text("Band : " + name);
	
	modal.find("#imageModal").html(imageDisplay);
	if (imageDisplay == "")
		modal.find("#imageModal").parent().addClass("hidden");
	else 
		modal.find("#imageModal").parent().removeClass("hidden");
	
	modal.find("#wikiModal").html(wikiDisplay);
	modal.find("#descModal").html(descDisplay);
	modal.find("#titleModal").html(titleDisplay);
	modal.modal("show");
}

/*
 * TOOLS functions
 */
 
function populateQuery(query, name, value) {
	var regex = new RegExp("@"+name, "gi");
	return query.replace(regex, value);
}

//credit : http://stackoverflow.com/a/3291856
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}