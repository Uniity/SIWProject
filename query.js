/*
 * GLOBAL variables
 */

var url = "http://dbpedia.org/sparql";

var stringQueryGenre = "\
    PREFIX dbpprop: <http://dbpedia.org/property/>\
    PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>\
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
    SELECT DISTINCT ?name ?sub\
    WHERE {\
        ?sub dbpprop:name ?name .\
        ?sub dbpedia-owl:instrument ?instru .\
        ?sub a <http://dbpedia.org/ontology/MusicGenre>\
    }";

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
	
var clickedBandName;
var currentBandInfo;

/*
 * ONLOAD functions
 */

$(document).ready(function() {
	
	//Concern Debug log
	$("#debug").hide();
	$("#debugButton").on("click", function () {
		$("#debug").toggle();
	});
	
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
	queryGenres();//Requesting DBpedia for all musical genres to enable the search by genre
});

/*
 * QUERY functions, calling to query data on dbpedia
 * These fonctions prepare the query, and the sparqlCall function send it
 */
 
//Simple ajax call to the url global var, sending the query param and specifying the successful return function
function sparqlCall(query, callbackFunction) {
	debug("info", "Ajax call for sparql query");
	$.ajax({
		dataType: "json",
		url: query,
		success: callbackFunction,
		error: function (xhr, ajaxOptions, thrownError) {
			debug("error", xhr.status + " - " + thrownError);
		}
	});
}

//All queryXXX function are call right after user action or on load. 

function queryGenres() {
	var queryUrl = encodeURI(url + "?query=" + stringQueryGenre + "&format=json");
	sparqlCall(queryUrl, callbackGenres);
}
 
 function queryBands() {
    var genre = $("#genre").val();
    debug("info", "Requesting queryBand for "+genre);
	$('#result').html("<div class='alert alert-info' role='alert'>Please wait... Query about : "+genre+"</div>");
    var queryUrl = encodeURI(url + "?query=" + populateQuery(stringQueryBand, "genre", genre) + "&format=json");
	sparqlCall(queryUrl, callbackBands);
}
 
 function queryTitles() {
	clickedBandName = $(this).text();
    var band = currentBandInfo[clickedBandName].dbpediaLink;
    debug("info", band + " - " + clickedBandName);
    var queryUrl = encodeURI(url + "?query=" + populateQuery(stringQueryTitle, "band", band) + "&format=json");
	sparqlCall(queryUrl, callbackBandInfo);
}

/*
 * CALLBACK functions, call after sparql queries on dbpedia
 */

function callbackGenres(data) {
	var genres = [];
	var genresDesc = [];
	var displayMsg = "";
	debug("success", "Successful genre query");
	var results = data.results.bindings;
	var num = results.length;
	debug(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		genres.push(results[i].name.value);
		genresDesc[results[i].name.value] = results[i].sub.value;
	}
	
	genres.sort();
	setGenreOptions(genres, genresDesc);
	$('#genre').prop('disabled', false);
}

function callbackBands(data) {
	var bandsInfo = [];
	var bands = [];
	currentBandInfo = [];
	debug("success", "Successful bands query");
	var results = data.results.bindings;
	var num = results.length;
	debug(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		bands.push(results[i].name.value);
		bandsInfo[results[i].name.value] = results[i].page.value; // desc : results[i].desc.value, dbpediaLink : results[i].sub.value};
		currentBandInfo[results[i].name.value] = {wiki : results[i].page.value, desc : results[i].desc.value, dbpediaLink : results[i].sub.value};
	}
	bands.sort();

	var genreName = $('#genre option:selected').text();
	setBandTable(genreName, bands, bandsInfo);
}

function callbackBandInfo(data) {
	var titles = [];
	debug("success", "Successful titles query");
	var results = data.results.bindings;
	var num = results.length;
	debug(num <= 0 ? "warning" : "info", "Number result = " + num);

	for (var i in results) {
		titles.push({title : results[i].name.value, album : results[i].albumname.value, date : results[i].date.value});
	}
	
	setBandModal(clickedBandName, titles, currentBandInfo[clickedBandName].desc);
}

/*
 * DISPLAY functions
 */

function debug(level, msg) {
    $('#debugTable').append("<tr class='"+level+"'><td>" + new Date().toLocaleString() +"</td><td><span class='label label-"+level+"'>"+level.capitalize()+"</span> - " + msg+"</td></tr>");
}

function setGenreOptions(array, urlArray) {
    var option = "";
    for (var i in array)
    option += "<option value=\"" + urlArray[array[i]] + "\">" + array[i] + "</option>";
    $('#genre').html(option);
}

function setBandTable(genreName, bands, bandsWiki) {
	var displayMsg = "";
	displayMsg = "<h3>" + genreName + " bands/artists : <span class='badge'>" + bands.length + "</span></h3><table class='table table-bordered table-hover'>"+
		"<tr><th>Band's name</th><th>Link to the wiki page</th></tr>";
	for (var i in bands) {
		displayMsg += "<tr><td class='clickableBand'>" + bands[i] + "</td><td><a href='" + bandsWiki[bands[i]].wiki + "'>Wiki</a></td></tr>";
	}
	displayMsg += "</table>";

    $('#result').html(displayMsg);
	
	$(".clickableBand").on("click", queryTitles);
}

function setBandModal(name, musics, desc) {
	var body = "<p>"+desc+"</p>";
	if (musics.length > 0) {
		body += "<table class='table table-bordered table-hover'>"+
			"<tr><th>Title's name</th><th>Title's album</th><th>Title release date</th></tr>";
		for (var i in musics) {
			body += "<tr><td>"+musics[i].title+"</td><td>"+musics[i].album+"</td><td>"+musics[i].date+"</td></tr>";
		}
		body += "</table>";
	}
	
	var modal = $("#bandModal");
	
	modal.find('.modal-title').text('Band : ' + name);
	modal.find('.modal-body').html(body);
	modal.modal("show");
}

/*
 * TOOLS functions
 */
 
function populateQuery(query, name, value) {
	var regex = new RegExp("@"+name, "gi");
	return query.replace(regex, value);
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}