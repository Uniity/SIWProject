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

$(document).ready(function() {
	
	$("#debug").hide();
	$("#debugButton").on("click", function () {
		$("#debug").toggle();
	});
	
	$('#bandModal').on('show.bs.modal', function (event) {
		var td = $(event.relatedTarget); // Button that triggered the modal
		var name = td.text(); // Extract info from data-* attributes
		// If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
		// Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
		var modal = $(this);
		modal.find('.modal-title').text('Band : ' + name);
		modal.find('.modal-body').text("PLACE HOLDER");
	});
	
	$("#genre").on("change", queryBands);
	queryGenres();
});

/*
 * QUERY functions, calling to query data on dbpedia
 */
 
function sparqlCall(query, callbackFunction) {
	$.ajax({
		dataType: "json",
		url: query,
		success: callbackFunction,
		error: function (xhr, ajaxOptions, thrownError) {
			debug("error", xhr.status + " - " + thrownError);
		}
	});
}

function queryGenres() {
	var queryUrl = encodeURI(url + "?query=" + stringQueryGenre + "&format=json");
	sparqlCall(queryUrl, callbackGenres);
}
 
 function queryBands() {
    var genre = $("#genre").val();
    debug("info", genre);
	$('#result').html("<div class='alert alert-info' role='alert'>Please wait... Query about : "+genre+"</div>");
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
	debug("success", "Successful genre query");
	var results = _data.results.bindings;
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

function callbackBands(_data) {
	var bandsWiki = [];
	var bands = [];
	debug("success", "Successful bands query");
	var results = _data.results.bindings;
	var num = results.length;
	debug(num <= 0 ? "warning" : "info", "Number result = " + num);

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

function debug(level, msg) {
    $('#debugTable').append("<tr class='"+level+"'><td>" + new Date()+"</td><td>" + level+"</td><td>" + msg+"</td></tr>");
}

function setGenreOptions(array, urlArray) {
    var option = "";
    for (var i in array)
    option += "<option value=\"" + urlArray[array[i]] + "\">" + array[i] + "</option>";
    $('#genre').html(option);
}

function setBandTable(genreName, num, bands, bandsWiki) {
	var displayMsg = "";
	displayMsg = "<h3>" + genreName + "'s bands (" + num + " results) :</h3><table class='table table-bordered table-hover'>"+
		"<tr><th>Band's name</th><th>Link to the wiki page</th></tr>";
	for (var i in bands) {
		displayMsg += "<tr><td data-toggle='modal' data-target='#bandModal'>" + bands[i] + "</td><td><a href='" + bandsWiki[bands[i]] + "'>Wiki</a></td></tr>";
	}
	displayMsg += "</table>";

    $('#result').html(displayMsg);
}