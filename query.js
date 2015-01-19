/*
 * GLOBAL variables
 */
 
//config variables
var debug = false;
var logging = true;

var url = "http://dbpedia.org/sparql";

//This query return all musical genre's name and dbpedia link 
var stringQueryGenre = "\
    PREFIX dbpprop: <http://dbpedia.org/property/>\
    SELECT DISTINCT ?name ?sub\
    WHERE {\
        ?sub a <http://dbpedia.org/ontology/MusicGenre> .\
        ?sub dbpprop:name ?name\
    }";

//This query return all musical bands/artists' name, wikipage link, description and dbpedia link related to thec chosen genre 
var stringQueryBand = "\
    PREFIX dbpprop: <http://dbpedia.org/property/>\
    PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>\
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
    SELECT ?name ?page ?desc ?sub\
    WHERE {\
        ?sub dbpprop:name ?name .\
        ?sub foaf:isPrimaryTopicOf ?page .\
        ?sub dbpedia-owl:abstract ?desc .\
        ?sub dbpedia-owl:genre <@genre> .\
        ?sub a <http://dbpedia.org/ontology/Band> .\
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
	
	$("#genre").on("change", queryBands);
	
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
	log("info", "Ajax call for sparql query");
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
		$('#result').html("<div class='ale rt alert-info' role='alert'>Please wait... Query about : "+genre+"</div>");
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
	var bandsInfo = [];
	var bands = [];
	currentBandInfo = [];
	log("success", "Successful bands query");
	var results = data.results.bindings;
	var num = results.length;
	log(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		bands.push(results[i].name.value);
		bandsInfo[results[i].name.value] = results[i].page.value;
		//currentBandInfos serve to keep artist/band infos so there is no need to request each time for single display
		currentBandInfo[results[i].name.value] = {wiki : results[i].page.value, desc : results[i].desc.value, dbpediaLink : results[i].sub.value};
	}
	bands.sort();

	var genreName = $('#genre option:selected').text();
	setBandTable(genreName, bands, bandsInfo);
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
	
	setBandModal(clickedBandName, titles, currentBandInfo[clickedBandName].desc);
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

function setBandTable(genreName, bands, bandsWiki) {
	var displayMsg = 
			"<h3>" + genreName + " bands/artists : </h3>"+
			"<p><span class='badge'>" + bands.length + "</span> results</p>";
	if (bands.length > 0) {
		displayMsg += 
			"<p>"+
				"<span class='label label-info'>Tips</span> "+
				"Click on band/artist name to show some informations about it"+
			"</p>"+
			"<table class='table table-bordered table-hover'>"+
				"<tr>"+
					"<th>Band's name</th>"+
					"<th>Link to the wiki page</th>"+
				"</tr>";
		for (var i in bands) {
			displayMsg += 
				"<tr>"+
					"<td class='clickableBand'>" + bands[i] + "</td>"+
					"<td><a href='" + bandsWiki[bands[i]] + "' target='_blank'>Wiki</a></td>"+
				"</tr>";
		}
		displayMsg += 
			"</table>";
	} else {
		displayMsg += "<p>There's no results for this genre.</p>";
	}

    $('#result').html(displayMsg);
	
	$(".clickableBand").on("click", queryTitles);
}

function setBandModal(name, musics, desc) {
	var body = "<p>"+desc+"</p>";
	if (musics.length > 0) {
		body += "<table class='table table-bordered table-hover'>"+
			"<tr>"+
				"<th>Title's name</th>"+
				"<th>Title's album</th>"+
				"<th>Title release date</th>"+
			"</tr>";
		for (var i in musics) {
			body += 
			"<tr>"+
				"<td>"+musics[i].title+"</td>"+
				"<td>"+musics[i].album+"</td>"+
				"<td>"+new Date(musics[i].date.split("+")[0]).toLocaleDateString()+"</td>"+
			"</tr>";
		}
		body += "</table>";
	}
	
	var modal = $("#bandModal");
	
	modal.find(".modal-title").text("Band : " + name);
	modal.find(".modal-body").html(body);
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