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
    SELECT ?name ?page\
    WHERE {\
        ?sub dbpprop:name ?name .\
        ?sub foaf:isPrimaryTopicOf ?page .\
        ?sub dbpedia-owl:genre <@genre> .\
        ?sub a <http://dbpedia.org/ontology/Band>\
    }";

/*
 * ONLOAD functions
 */

function trigger() {
	$("#genre").on("change", queryBands);
	queryGenres();
}

/*
 * QUERY functions, calling to query data on dbpedia
 */
 
function sparqlCall(query, callbackFunction) {
	$.ajax({
		dataType: "json",
		url: query,
		success: callbackFunction,
		error: function (xhr, ajaxOptions, thrownError) {
			debug("error : " + xhr.status + " // " + thrownError);
		}
	});
}

function queryGenres() {
	var queryUrl = encodeURI(url + "?query=" + stringQueryGenre + "&format=json");
	sparqlCall(queryUrl, callbackGenres);
}
 
 function queryBands() {
    var genre = $("#genre").val();
    debug(genre);
    var queryUrl = encodeURI(url + "?query=" + populateQuery(stringQueryBand, "genre", genre) + "&format=json");
	sparqlCall(queryUrl, callbackBands);
}

/*
 * CALLBACK functions, call after sparql queries on dbpedia
 */

function callbackGenres(_data) {
	var genres = [];
	var genresDesc = [];
	var displayMsg = "";
	debug("Successful genre query");
	var results = _data.results.bindings;
	debug("Number result = " + results.length);

	for (var i in results) {
		genres.push(results[i].name.value);
		genresDesc[results[i].name.value] = results[i].sub.value;
	}
	
	genres.sort();
	setGenreOptions(genres, genresDesc);
	$('#genre').prop('disabled', false);
}

function callbackBands(_data) {
	var bandsWiki = [];
	var bands = [];
	debug("Callback");
	var results = _data.results.bindings;
	debug("Number result = " + results.length);
	var num = results.length;

	for (var i in results) {
		bands.push(results[i].name.value);
		bandsWiki[results[i].name.value] = results[i].page.value;
	}
	bands.sort();

	var genreName = $('#genre option:selected').text();
	setBandTable(genreName, num, bands, bandsWiki)
}

/*
 * TOOLS functions
 */
 
function populateQuery(query, name, value) {
	var regex = new RegExp("@"+name, "gi");
	return query.replace(regex, value);
}

/*
 * DISPLAY functions
 */

function debug(msg) {
    $('#debug').append("<br /> - " + msg);
}

function setGenreOptions(array, urlArray) {
    var option = "";
    for (var i in array)
    option += "<option value=\"" + urlArray[array[i]] + "\">" + array[i] + "</option>";
    $('#genre').html(option);
}

function setBandTable(genreName, num, bands, bandsWiki) {
	var displayMsg = "";
	displayMsg = "<h2>" + genreName + "'s bands (" + num + " results) :</h2><table style='width:100%'>";
	for (var i in bands) {
		displayMsg += "<tr><td>" + bands[i] + "</td><td><a href='" + bandsWiki[bands[i]] + "'>Wiki</a></td></tr>";
	}
	displayMsg += "</table>";

    $('#result').html(displayMsg);
}