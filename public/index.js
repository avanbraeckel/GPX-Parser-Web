// Put all onload AJAX calls here, and event listeners
jQuery(document).ready(function() {
    // On page-load AJAX Example
    jQuery.ajax({
        type: 'get',            //Request type
        dataType: 'json',       //Data type - we will use JSON for almost everything 
        url: '/getUploadFiles',   //The server endpoint we are connecting to
        success: function (data) {
            // /*  Do something with returned object
            //     Note that what we get is an object, not a string, 
            //     so we do not need to parse it on the server.
            //     JavaScript really does handle JSONs seamlessly
            // */
            // jQuery('#blah').html("On page load, received string '"+data.somethingElse+"' from server");
            // //We write the object to the console to show that the request was successful
            // TODO DISABLE DATABASE STUFF
            document.getElementById("store-all-files-btn").disabled = true;
            document.getElementById("clear-all-data-btn").disabled = true;
            document.getElementById("dbstatus-btn").disabled = true;
            document.getElementById("query-file-select").disabled = true;
            document.getElementById("query-route-select").disabled = true;
            document.getElementById("query-name-radio").disabled = true;
            document.getElementById("query-length-radio").disabled = true;
            document.getElementById("query1-radio").disabled = true;
            document.getElementById("query2-radio").disabled = true;
            document.getElementById("query3-radio").disabled = true;
            document.getElementById("query4-radio").disabled = true;
            document.getElementById("query5-radio").disabled = true;
            document.getElementById("query-num-routes-field").disabled = true;
            document.getElementById("query-short-radio").disabled = true;
            document.getElementById("query-long-radio").disabled = true;
            document.getElementById("execute-query-btn").disabled = true;

            // display error message if no files on server
             if(data.length == 0) {
                
                console.log("'No files' should be displayed in the File Log Panel");
                // get the table for file log panel and calc row length
                var tableBody = document.getElementById("file-log-table").getElementsByTagName("tbody")[0];
                var rowLength = tableBody.rows.length;
                var row = tableBody.insertRow(rowLength);

                // Insert new cells in the empty row
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                var cell5 = row.insertCell(4);
                var cell6 = row.insertCell(5);

                // Add some default text to the new cells:
                cell1.innerHTML = "No files";
                cell2.innerHTML = "-";
                cell3.innerHTML = "-";
                cell4.innerHTML = "-";
                cell5.innerHTML = "-";  
                cell6.innerHTML = "-";                 
            } else {
                fillFileLogTable();
            }
            console.log(data); 
        },
        fail: function(error) {
            // Non-200 return, do something with error
            $('#blah').html("On page load, received error from server");
            console.log(error); 
        }
    });


    // // Event listener form example , we can use this instead explicitly listening for events
    // // No redirects if possible
    // $('#someform').submit(function(e){
    //     $('#blah').html("Form has data: "+$('#entryBox').val());
    //     e.preventDefault();
    //     //Pass data to the Ajax call, so it gets passed to the server
    //     $.ajax({
    //         //Create an object for connecting to another waypoint
    //     });
    // });
});

function fillFileLogTable() {
    $.ajax({
        type: 'get',
        url: '/fileLogTable',
        success: function (data) {
            // get the file log table
            var tableBody = document.getElementById("file-log-table").getElementsByTagName("tbody")[0];
            var rowLength = tableBody.rows.length;
            
            // remove all rows from tbody first, and then recalculate row length
            for(var i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }
            rowLength = tableBody.rows.length;
            var validFileCount = 0;
            var passedFirstValid = false;
            
            // reset gpx file view dropdown
            var selGpxView = document.getElementById("gpx-view-select");
            var len = selGpxView.options.length;
            for (var i = len - 1; i >= 0; i--) {
                selGpxView.remove(i);
            }

            // fill in each row of the file log panel table using valid iCal files on server
            for(var i = 0; i < data.length; i++) {
                // check if the file is valid
                if( data[i][0].valid === true) {
                    if (passedFirstValid === false) {
                        passedFirstValid = true;
                        fillGpxViewTable(data[i][0].filename); // fills gpx view table with the first valid file
                        //enable the gpx view panel buttons
                        document.getElementById("show-other-data-btn").disabled = false;
                        document.getElementById("rename-btn").disabled = false;
                        document.getElementById("rename-field").disabled = false;
                        document.getElementById("rename-field").required = true;
                        document.getElementById("length-btn").disabled = false;
                        document.getElementById("length-field").disabled = false;
                        document.getElementById("length-field").required = true;
                        document.getElementById("create-gpx-name").disabled = false;
                        document.getElementById("create-gpx-version").disabled = false;
                        document.getElementById("create-gpx-creator").disabled = false;
                        document.getElementById("create-gpx-name").required = true;
                        document.getElementById("create-gpx-version").required = true;
                        document.getElementById("create-gpx-creator").required = true;
                        document.getElementById("add-route-numWpts").required = true;
                        document.getElementById("add-route-lats").required = true;
                        document.getElementById("add-route-lons").required = true;
                        document.getElementById("find-path-btn").disabled = false;
                    }
                    // insert empty row at end
                    var row = tableBody.insertRow(rowLength + validFileCount);
                    
                    // Insert new cells in the empty row
                    var cell1 = row.insertCell(0); //filename
                    var cell2 = row.insertCell(1); //version
                    var cell3 = row.insertCell(2); //creator
                    var cell4 = row.insertCell(3); //# of waypoints
                    var cell5 = row.insertCell(4); //# of routes
                    var cell6 = row.insertCell(5); //# of tracks

                    // fill in each cell with the corresponding information (adding style attributes as necessary)
                    cell1.innerHTML = "<a href=\"./uploads/" + data[i][0].filename + "\">" + data[i][0].filename + "</a>";
                    cell2.innerHTML = data[i][1].version;
                    cell3.innerHTML = data[i][1].creator;
                    cell4.innerHTML = data[i][1].numWaypoints;
                    cell5.innerHTML = data[i][1].numRoutes;
                    cell6.innerHTML = data[i][1].numTracks;

                    validFileCount++; 
                    addToGpxViewDropdown(data[i][0].filename);
                } else {
                    console.log("Error: file '" + data[i][0].filename + "' is invalid, and thus won't be displayed. It will also be removed from the server.");
                }
            } // end for loop

            // display error message if no files on server
            if(validFileCount <= 0) {

                console.log("'No files' should be displayed in file log panel");
                
                // get the table for file log panel and calc row length
                var tableBody = document.getElementById("file-log-table").getElementsByTagName("tbody")[0];
                var rowLength = tableBody.rows.length;
                var row = tableBody.insertRow(rowLength);

                // Insert new cells in the empty row
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                var cell5 = row.insertCell(4);
                var cell6 = row.insertCell(5);

                // Add some default text to the new cells:
                cell1.innerHTML = "No files";
                cell2.innerHTML = "-";
                cell3.innerHTML = "-";
                cell4.innerHTML = "-";
                cell5.innerHTML = "-";
                cell6.innerHTML = "-";
                
                // disable the gpx view panel buttons since there are no files
                document.getElementById("show-other-data-btn").disabled = true;
                document.getElementById("rename-btn").disabled = true;
                document.getElementById("rename-field").disabled = true;
                document.getElementById("length-btn").disabled = true;
                document.getElementById("length-field").disabled = true;
                document.getElementById("find-path-btn").disabled = true;
                // TODO DISABLE DATABASE STUFF
                document.getElementById("store-all-files-btn").disabled = true;
            }
        },
        error: function(data) {
            // display error to log
            console.log("Error: Could not fill the 'File Log Panel' with initial data");
        },
        fail: function(data) {
            // display error to logg
            console.log("Failure: Could not fill the 'File Log Panel' with initial data");
        }
    });
}

// populate dropdown selection box
function addToGpxViewDropdown(filename) {
    var selGpxView = document.getElementById("gpx-view-select");

    // // remove all current options first
    // var len = selGpxView.options.length;
    // for (var i = len-1; i >= 0; i--) {
    //     selGpxView.remove(i);
    // }
    
    var newOption = document.createElement("option");
    newOption.text = filename;
    newOption.value = filename;
    selGpxView.add(newOption);
}

function fillGpxViewTable (fname) {

    $.ajax({
        type: "get",
        url: "/viewGpx",
        dataType: "json",
        data: { filename : fname }, 
        success: function(data) {
            // get the table for gpx view panel and get row length
            var tableBody = document.getElementById("gpx-view-table").getElementsByTagName("tbody")[0];
            var rowLength = tableBody.rows.length;
            // remove all rows from tbody first
            for(var i = rowLength-1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }
            rowLength = tableBody.rows.length;

            // remove all current options from gpx file dropdown first
            var rtesAndTrks = document.getElementById("routes-and-tracks-select");
            var len = rtesAndTrks.options.length;
            for (var i = len - 1; i >= 0; i--) {
                rtesAndTrks.remove(i);
            }

            console.log("GPX View Panel Table filled with data from following:");
            console.log(data);
            // add routes to table
            for (var i = 0; i < data.routes.length; i++) {
                var row = tableBody.insertRow(rowLength + i);
                var cell1 = row.insertCell(0); //component
                var cell2 = row.insertCell(1); //name
                var cell3 = row.insertCell(2); //# of points
                var cell4 = row.insertCell(3); //length
                var cell5 = row.insertCell(4); //loop
                
                cell1.innerHTML = "Route " + (i + 1);
                if (data.routes[i].name.localeCompare("None") != 0) { // Has a name
                    cell2.innerHTML = data.routes[i].name;
                } else {
                    cell2.innerHTML = " ";
                }
                cell3.innerHTML = data.routes[i].numPoints;
                cell4.innerHTML = data.routes[i].len;
                cell5.innerHTML = data.routes[i].loop;
                addToGpxFileDropdown("Route " + (i + 1));
            }
            rowLength = tableBody.rows.length;
            // add tracks to table
            for (var i = 0; i < data.tracks.length; i++) {
                var row = tableBody.insertRow(rowLength + i);
                var cell1 = row.insertCell(0); //component
                var cell2 = row.insertCell(1); //name
                var cell3 = row.insertCell(2); //# of points
                var cell4 = row.insertCell(3); //length
                var cell5 = row.insertCell(4); //loop

                cell1.innerHTML = "Track " + (i + 1);
                if (data.tracks[i].name.localeCompare("None") != 0) { // Has a name
                    cell2.innerHTML = data.tracks[i].name;
                } else {
                    cell2.innerHTML = " ";
                }
                cell3.innerHTML = data.tracks[i].numPoints;
                cell4.innerHTML = data.tracks[i].len;
                cell5.innerHTML = data.tracks[i].loop;
                addToGpxFileDropdown("Track " + (i + 1));
            }
        },
        error: function(error) {
            // display error msg if it's an empty filename
                console.log("Error: GPX View Panel - " + error); 
        },
        fail: function(error) {
            // display error msg if it's an empty filename
            console.log("Failure: GPX View Panel - " + error); 
        }
    });
}

function addToGpxFileDropdown(name) {
    var rtesAndTrks = document.getElementById("routes-and-tracks-select");
    var newOption = document.createElement("option");
    newOption.text = name;
    newOption.value = name;
    rtesAndTrks.add(newOption);
}

// selection/dropdown box for gpx view panel table
document.getElementById("gpx-view-select").onchange = function() {
    // fills the GPX View Panel with the selected file's data
    fillGpxViewTable(this.value);

    console.log("GPX File selected: '" + this.value + "'");
}

// "Show Other Data" button (for gpx view panel)
document.getElementById("show-other-data-btn").onclick = function() {
    var dropdownSel = document.getElementById("routes-and-tracks-select").value;
    if (dropdownSel.length === 0) {
        alert("'Show Other Data': No Route or Track Selected!");
        console.log("Cannot 'Show Other Data' when no Route or Track is selected.");
        return;
    }
    var filename = document.getElementById("gpx-view-select").value;
    console.log("Showing other data for " + dropdownSel + " of '" + filename + "'");
    showOtherData(dropdownSel, filename);
}

function showOtherData(rteOrTrkName, fname) {
    $.ajax({
        type: "get",
        url: "/viewGpxOtherData",
        dataType: "json",
        data: { selection : rteOrTrkName, filename : fname }, 
        success: function(data) {
            var outputStr = "";
            for (var i = 0; i < data.length; i++) {
                outputStr += "'" + data[i].name + "': '" + data[i].value + "', \r\n";
            }
            if (data == null || data.length === 0) {
                outputStr += rteOrTrkName + " has no 'Other Data'\r\n";
            }
            alert(outputStr);
        },
        error: function(error) {
            // display error message
            alert("Failed to show other data for " + rteOrTrkName + " in '" + fname + "'");
            console.log("Error: GPX View Panel - other data - " + error); 
        },
        fail: function(error) {
            alert("Failed to show other data for " + rteOrTrkName + " in '" + fname + "'");
            console.log("Failure: GPX View Panel - other data - " + error); 
        }
    });
}

// set-up listening for the enter key in the rename text field
document.getElementById("rename-field")
.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("rename-btn").click();
    }
});

// "Rename" button clicked (for gpx view panel)
document.getElementById("rename-btn").onclick = function() {
    var newName = document.getElementById("rename-field").value;
    if (newName == null || newName.length === 0) {
        console.log("'Rename': Empty names for renaming Routes/Tracks are not allowed");
        alert("'Rename': Empty names for renaming Routes/Tracks are not allowed!");
        return;
    }
    if (newName.includes('"')) {
        console.log("'Rename': Quotation marks are not permitted in the name");
        alert("'Rename': Quotation marks are not allowed in the name!");
        return;
    }
    var filename = document.getElementById("gpx-view-select").value;
    var rteOrTrk = document.getElementById("routes-and-tracks-select").value;
    if (rteOrTrk.length === 0) {
        alert("'Rename': No Route or Track Selected!");
        console.log("Cannot 'Rename' when no Route or Track is selected.");
        return;
    }
    console.log("Changing name of " + rteOrTrk + " in '" + filename + "' to '" + newName + "'");
    renameRteOrTrk(rteOrTrk, newName, filename);
}

// renames the given route/track with the given name in the specified file
function renameRteOrTrk(rteOrTrk, name, fname) {
    $.ajax({
        type: "get",
        url: "/viewGpxRename",
        dataType: "text",
        data: { selection : rteOrTrk, newName : name, filename : fname }, 
        success: function(data) {
            console.log(data);
            fillGpxViewTable(fname);
            // update DB
            trackRouteUpdates();
        },
        error: function(error) {
            // display error message
            alert("Failed to rename " + rteOrTrk + " in '" + fname + "' to '" + name + "'");
            console.log("Error: GPX View Panel - rename - " + error); 
        },
        fail: function(error) {
            alert("Failed to rename " + rteOrTrk + " in '" + fname + "' to '" + name + "'");
            console.log("Failure: GPX View Panel - rename - " + error); 
        }
    });
}

// Create GPX

// "Create GPX" button clicked (for gpx view panel)
document.getElementById("create-gpx-btn").onclick = function() {
    var gpxFilename = document.getElementById("create-gpx-name").value;
    var gpxCreator = document.getElementById("create-gpx-creator").value;
    var gpxVersion = document.getElementById("create-gpx-version").value;
    if (gpxFilename.length === 0 || gpxCreator.length === 0 || gpxVersion.length === 0) {
        alert("'Create GPX': You must fill-in all fields to create a GPX Document!");
        console.log("'Create GPX': Empty fields not allowed when creating a GPX document");
        return;
    }
    if (isValidFloat(gpxVersion) === false) {
        alert("'Create GPX': The version number must be a valid floating-point number, with no whitespace!");
        console.log("'Create GPX': The version number must be a valid floating-point number, with no whitespace!");
        return;
    }
    console.log("Creating GPX Document '" + gpxFilename + "', version " + gpxVersion + ", with creator '" + gpxCreator + "'");
    createGpxDoc(gpxFilename, gpxVersion, gpxCreator);
}

// creates a gpx doc with the given name
function createGpxDoc(gpxFilename, gpxVersion, gpxCreator) {
    $.ajax({
        type: "get",
        url: "/createGPX",
        dataType: "text",
        data: { filename : gpxFilename, version : gpxVersion, creator : gpxCreator }, 
        success: function(data) {
            alert(data);
            console.log(data);
            // fill the file log table and gpx view table, and the dropdown boxes again
            fillFileLogTable();

            // update DB if creating the gpx doc is successful, and if someone is logged-in
            if (data.includes("Successful") && dbConf.user.localeCompare('n/a') != 0 && dbConf.password.localeCompare('n/a') != 0
                    && dbConf.database.localeCompare('n/a') != 0) {
                let fileInfo = [];
                // add new file manually
                let newFilename = gpxFilename + ".gpx";
                fileInfo.push({filename: newFilename, version: gpxVersion, creator: gpxCreator});
                let tableBody = document.getElementById("file-log-table").getElementsByTagName("tbody")[0];
                let rowLength = tableBody.rows.length;
                // remove all rows from tbody first
                for(let i = rowLength - 1; i >= 0; i--) {
                    let tableCells = tableBody.rows.item(i).cells;
                    let fname = tableCells.item(0).getElementsByTagName("a")[0].innerHTML;
                    let ver = tableCells.item(1).innerHTML;
                    let crtr = tableCells.item(2).innerHTML;
                    // add to array
                    fileInfo.push({filename: fname, version: ver, creator: crtr});
                }

                storeAllFiles(dbConf, fileInfo);
            }
        },
        error: function(error) {
            // display error message
            alert("Error in creating GPX Document '" + gpxFilename + "', version " + gpxVersion + ", with creator '" + gpxCreator + "'");
            console.log("Error: GPX View Panel - create GPX - " + error); 
        },
        fail: function(error) {
            alert("Failed to create GPX Document '" + gpxFilename + "', version " + gpxVersion + ", with creator '" + gpxCreator + "'");
            console.log("Failure: GPX View Panel - create GPX - " + error); 
        }
    });
}

// ADD ROUTE

document.getElementById("add-route-instructions-btn").onclick = function() {
    // shows the user instructions for "Add Route" through an alert
    alert("   -   The 'Name' field is not required, but the 'Number of Waypoints' field is always required, and the other fields are required if the number of waypoints is not equal to 0\r\n"
            + "   -   The 'Number of Waypoints' field should contain an integer equal to 0 or greater, specifying the desired number of waypoints in the route\n"
            + "   -   'Latitudes' should consist of comma-separated floating-point values (no spaces allowed) ranging from -90.0 to 90.0, being in order of the"
                + " waypoint number (eg. the first waypoint's latitude will be the first number in the list)\r\n"
            + "   -   'Longitudes' is the same format as above, except it corresponds to the waypoint's longitude, which ranges from -180.0 to 180.0\n"
            + "   -   The Latitudes and Longitudes of the waypoints are pairs, so there must be an equal number of comma-separated floating-point values in both"
                + " of the fields (The number of values specified in 'Number of Waypoints', to be exact)\r\n"
            + "\r\nAn input example for 'Latitudes' when 'Number of Waypoints' is equal to 3:\r\n43.549239,21.320918,-1.000872");
}

document.getElementById("add-route-btn").onclick = function() {
    var filename = document.getElementById("gpx-view-select").value;
    var routeName = document.getElementById("add-route-name").value;
    var numWptsStr = document.getElementById("add-route-numWpts").value;
    var latsStr = document.getElementById("add-route-lats").value;
    var lonsStr = document.getElementById("add-route-lons").value;
    // check if there is a file selected
    if (filename === null || filename.length <= 0) {
        alert("'Add Route': Cannot add a route without a file selected!");
        return;
    }
    // check if all mandatory fields are filled
    if (numWptsStr === null || numWptsStr.length === 0) {
        alert("'Add Route': You must give a number of waypoints!");
        return;
    }
    // check number of waypoints
    var numWpts = parseInt(numWptsStr);
    if (isNaN(numWpts) || numWpts < 0) {
        alert("'Add Route': Number of waypoints '" + numWptsStr + "' must be an integer greater or equal to 0!");
        return;
    }
    if (numWpts === 0)  { // wants NO waypoints
        if (latsStr.length != 0 || lonsStr.length != 0) {
            alert("'Add Route': If there are to be 0 points in the route, the latitude and longitude fields must be empty!");
            return;
        }
    } // otherwise, at least 1 waypoint
    if (numWpts != 0 && (latsStr === null || latsStr.length === 0 || lonsStr === null || lonsStr.length === 0) ) { // no lats and lons given
        alert("'Add Route': The Latitudes and Longitudes fields must be filled!");
        return;
    }
    if (routeName != null && routeName.includes('"') === true) {
        alert("'Add Route': Quotation marks are not permitted in the Route name!");
        return;
    }
    // Check latitudes and longitudes
    
    if (numWpts > 0) {
        // check number of commas in latitudes
        var numCommas = 0;
        for (var i = 0; i < latsStr.length; i++) {
            if (latsStr.charAt(i) == ',') {
                numCommas++;
            }
        }
        if ( (numWpts > 0 && numCommas != numWpts - 1) || latsStr.charAt(latsStr.length - 1) == ',') { // should always be 1 less comma than waypoints, as there should not be a comma at the end
            alert("'Add Route': The number of values (or commas) for the latitudes is incorrect!");
            return;
        }
        var latsValues = latsStr.split(",");
        if (latsValues.length != numWpts) {
            alert("'Add Route': Number of latitudes given does not match the number of waypoints specified!");
            return;
        }
        for (var i = 0; i < latsValues.length; i++) {
            if (isValidFloat("" + latsValues[i]) === false) {
                alert("'Add Route': One or more of the given latitude values are invalid! They must be floating-point numbers, with no whitespace!");
                return;
            }
            var numVal = parseFloat("" + latsValues[i]);
            if ( isNaN(numVal)  || numVal < -90.0 || numVal > 90.0) {
                alert("'Add Route': One or more of the given latitude values are invalid! They must be floating-point numbers, with no whitespace!");
                return;
            }
        }
        var lats = JSON.parse("[" + latsStr + "]"); // safe to parse it
        // check number of commas for longitudes
        var numCommas = 0;
        for (var i = 0; i < lonsStr.length; i++) {
            if (lonsStr.charAt(i) == ',') {
                numCommas++;
            }
        }
        if (numCommas != numWpts - 1 || lonsStr.charAt(lonsStr.length - 1) == ',') { // should always be 1 less comma than waypoints, as there should not be a comma at the end
            alert("'Add Route': The number of values (or commas) for the longitudes is incorrect!");
            return;
        }
        lonsValues = lonsStr.split(",");
        if (lonsValues.length != numWpts) {
            alert("'Add Route': Number of longitudes given does not match the number of waypoints specified!");
            return;
        }
        for (var i = 0; i < lonsValues.length; i++) {
            if (isValidFloat("" + lonsValues[i]) === false) {
                alert("'Add Route': One or more of the given longitude values are invalid!");
                return;
            }
            var numVal = parseFloat("" + lonsValues[i]);
            if (isNaN(numVal) || numVal < -180.0 || numVal > 180.0) {
                alert("'Add Route': One or more of the given longitude values are invalid!");
                return;
            }
        }
        var lons = JSON.parse("[" + lonsStr + "]"); // safe to parse it
    } else { // no waypoints
        var lats = "[]";
        var lons = "[]";
    }

    var routeObj = {
        numWaypoints: numWpts,
        latitudes: lats,
        longitudes: lons
    };
    var objStr = JSON.stringify(routeObj);
    addRouteToFile(filename, objStr, routeName);
}

// creates a route with the given data and adds it to the given file
function addRouteToFile(gpxFilename, routeObj, routeName) {
    $.ajax({
        type: "get",
        url: "/addRoute",
        dataType: "text",
        data: { filename : gpxFilename, route : routeObj, name : routeName }, 
        success: function(data) {
            alert(data);
            console.log(data);
            // fill the file log table and gpx view table, and the dropdown boxes again
            fillFileLogTable();
            fillGpxViewTable(gpxFilename);
            // update DB
            trackRouteUpdates();
        },
        error: function(error) {
            // display error message
            alert("Failed to add route to '" + gpxFilename + "'.");
            console.log("Error: GPX View Panel - add route - " + error); 
        },
        fail: function(error) {
            alert("Failed to add route to '" + gpxFilename + "'.");
            console.log("Failure: GPX View Panel - add route - " + error); 
        }
    });
}

// Find Path Between

// "Find Path" button has been clicked for the submission
document.getElementById("find-path-btn").onclick = function() {
    var startLatStr = document.getElementById("find-path-startLat").value;
    var startLonStr = document.getElementById("find-path-startLon").value;
    var endLatStr = document.getElementById("find-path-endLat").value;
    var endLonStr = document.getElementById("find-path-endLon").value;
    var deltaStr = document.getElementById("find-path-delta").value;

    // error-check input

    // check if all fields are filled
    if (startLatStr == null || startLatStr.length <= 0 
            || startLonStr == null || startLonStr.length <= 0
            || endLatStr == null || endLatStr.length <= 0
            || endLonStr == null || endLonStr.length <= 0
            || deltaStr == null || deltaStr.length <= 0 ) {
        alert("'Find Path': All fields are required!");
        return;
    }

    // check for valid input
    if (isValidFloat(startLatStr) === false || isValidFloat(startLonStr) === false
            || isValidFloat(endLatStr) === false || isValidFloat(endLonStr) === false) {
        alert("'Find Path': All values must be valid floating-point numbers, with no whitespace!");
        return;
    }

    // check for valid floating-point numbers within the proper ranges
    var startLat = parseFloat(startLatStr);
    var startLon = parseFloat(startLonStr);
    var endLat = parseFloat(endLatStr);
    var endLon = parseFloat(endLonStr);
    var comparDelta = parseFloat(deltaStr);

    // check latitudes (-90.0 to 90.0)
    if (isNaN(startLat) || startLat < -90.0 || startLat > 90.0) {
        alert("'Find Path': Starting Latitude is invalid - it must be a floating-point number in the range of -90.0 to 90.0!")
        return;
    } else if (isNaN(endLat) || endLat < -90.0 || endLat > 90.0) {
        alert("'Find Path': Ending Latitude is invalid - it must be a floating-point number in the range of -90.0 to 90.0!")
        return;
    } else if (isNaN(startLon) || startLon < -180.0 || startLon > 180.0) {
        alert("'Find Path': Starting Longitude is invalid - it must be a floating-point number in the range of -180.0 to 180.0!")
        return;
    } else if (isNaN(endLon) || endLon < -180.0 || endLon > 180.0) {
        alert("'Find Path': Ending Longitude is invalid - it must be a floating-point number in the range of -180.0 to 180.0!")
        return;
    } else if (isNaN(comparDelta) || comparDelta < 0) {
        alert("'Find Path': Point Comparison Accuracy (delta) is invalid - it must be a non-negative floating-point number!")
        return;
    }

    var findPathObj = {
        startingLat: startLat,
        startingLon: startLon,
        endingLat: endLat,
        endingLon: endLon,
        delta: comparDelta
    };
    var objStr = JSON.stringify(findPathObj);
    findPathBetween(objStr);
}

// finds paths between the given waypoints if they exist
function findPathBetween(objStr) {
    $.ajax({
        type: "get",
        url: "/findPath",
        dataType: "json",
        data: { JSONstr : objStr }, 
        success: function(data) {
            // get the table for gpx view panel and get row length
            var tableBody = document.getElementById("path-view-table").getElementsByTagName("tbody")[0];
            var rowLength = tableBody.rows.length;
            // remove all rows from tbody first
            for(var i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }
            rowLength = tableBody.rows.length;
            // no valid paths were found
            if (data.length <= 0) {
                // add dummy data if there are no routes
                var row = tableBody.insertRow(rowLength + i);
                // Insert new cells in the empty row
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                var cell5 = row.insertCell(4);

                // Add some default text to the new cells:
                cell1.innerHTML = "No Paths";
                cell2.innerHTML = "-";
                cell3.innerHTML = "-";
                cell4.innerHTML = "-";
                cell5.innerHTML = "-";
                
                alert("'Find Path': No paths were found for the given points.");
                console.log("No paths were found for the given points for 'Find Path'");
                return;
            } // otherwise there is at least 1 valid path

            console.log("The 'Paths' Table is filled with data from the following:");
            console.log(data);

            let routeNum = 1;
            let trackNum = 1;
            // add routes/tracks to table
            for (var k = 0; k < data.length; k++) {
                rowLength = tableBody.rows.length;
                for (var i = 0; i < data[k].routes.length; i++) {
                    var row = tableBody.insertRow(rowLength + i);
                    var cell1 = row.insertCell(0); //component
                    var cell2 = row.insertCell(1); //name
                    var cell3 = row.insertCell(2); //# of points
                    var cell4 = row.insertCell(3); //length
                    var cell5 = row.insertCell(4); //loop
                    
                    cell1.innerHTML ="Route " + routeNum + "\r\n" + '("' + data[k].filename + '")';
                    routeNum++;
                    if (data[k].routes[i].name.localeCompare("None") != 0) { // Has a name
                        cell2.innerHTML = data[k].routes[i].name;
                    } else {
                        cell2.innerHTML = " ";
                    }
                    cell3.innerHTML = data[k].routes[i].numPoints;
                    cell4.innerHTML = data[k].routes[i].len;
                    cell5.innerHTML = data[k].routes[i].loop;
                }
                rowLength = tableBody.rows.length;
                for (var i = 0; i < data[k].tracks.length; i++) {
                    var row = tableBody.insertRow(rowLength + i);
                    var cell1 = row.insertCell(0); //component
                    var cell2 = row.insertCell(1); //name
                    var cell3 = row.insertCell(2); //# of points
                    var cell4 = row.insertCell(3); //length
                    var cell5 = row.insertCell(4); //loop
                    
                    cell1.innerHTML ="Track " + trackNum + "\r\n" + '("' + data[k].filename + '")';
                    trackNum++;
                    if (data[k].tracks[i].name.localeCompare("None") != 0) { // Has a name
                        cell2.innerHTML = data[k].tracks[i].name;
                    } else {
                        cell2.innerHTML = " ";
                    }
                    cell3.innerHTML = data[k].tracks[i].numPoints;
                    cell4.innerHTML = data[k].tracks[i].len;
                    cell5.innerHTML = data[k].tracks[i].loop;
                }
            }
        },
        error: function(error) {
            // display error message
            alert("Error when finding paths.");
            console.log("Error: GPX View Panel - find path - " + error); 
        },
        fail: function(error) {
            alert("Failure when finding paths.");
            console.log("Failure: GPX View Panel - find path - " + error); 
        }
    });
}

// BONUS FUNCTIONS - get num routes/tracks with specified length

// set-up listening for the enter key in the length text field
document.getElementById("length-field")
.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("length-btn").click();
    }
});

// "Get Number of Routes/Tracks" button clicked (for gpx view panel)
document.getElementById("length-btn").onclick = function() {
    var lenStr = document.getElementById("length-field").value;
    if (lenStr == null || lenStr.length === 0) {
        alert("'Length': It must be a non-negative floating-point number, with no whitespace!");
        return;
    }

    if (isValidFloat(lenStr) === false) {
        alert("'Length': It must be a non-negative floating-point number, with no whitespace!");
        return;
    }
    var len = parseFloat(lenStr);
    if (isNaN(len) || len < 0) {
        alert("'Length': It must be a non-negative floating-point number, with no whitespace!");
        return;
    }

    console.log("Counting the number of routes/tracks with a length of " + len);
    getNumRtesAndTrksWithLength(len);
}

function getNumRtesAndTrksWithLength(length) {
    $.ajax({
        type: "get",
        url: "/getNumWithLength",
        dataType: "json",
        data: { len : length }, 
        success: function(data) {
            
            // no valid paths were found
            if (data.length <= 0) {
                alert("No Routes or Tracks that match the specified length of " + length + " (within 10m) is present.")
                console.log("No Routes or Tracks that match the specified length of " + length + " (within 10m) is present.");
                return;
            } // otherwise there is at least 1 valid route/track

            console.log("'Length': Successful");
            alert("Number of Routes: " + data.routes + ", Number of Tracks: " + data.tracks);
        },
        error: function(error) {
            // display error message
            alert("Error when counting number of routes/tracks that match the given length.");
            console.log("Error: Get number of routes/tracks with length " + length + " - " + error); 
        },
        fail: function(error) {
            alert("Failure when counting number of routes/tracks that match the given length.");
            console.log("Error: Get number of routes/tracks with length " + length + " - " + error); 
        }
    });
}

function isValidFloat(floatStr) {
    if (floatStr.length === 0) return false;
    // check for any letters in the string
    var numPeriods = 0;
    var hasNum = false;
    for (var i = 0; i < floatStr.length; i++) {
        var charCode = floatStr.charCodeAt(i);
        var char = floatStr.charAt(i);
        if (charCode > 47 && charCode < 58) { // a numerical digit (0-9)
            hasNum = true;
        } else if (char === '.') { // a decimal
            numPeriods++;
            if (numPeriods > 1) {
                return false; // too many decimal points in a single number
            }
        } else if (char === '-') { // a negative sign
            if (i != 0) return false; // can only be the first character (before the number)
        } else {
            return false;
        }
    }

    if (hasNum === false) return false;

    // check parsing
    var floatParsed = parseFloat(floatStr);
    if (isNaN(floatParsed)) return false; // not a number

    return true; // valid
}

// UPLOAD FILE

document.getElementById("upload-file-btn").onclick = function() { // alerts for errors
    var fileStr = document.getElementById("upload-file-select").value;
    if (fileStr == null || fileStr.length === 0) { // no file
        alert("No files were uploaded.");
        console.log("No files were uploaded.");
        return;
    }
    var periodIndex = fileStr.indexOf(".");
    var isValid = false;
    if (periodIndex != -1) {
        var fileExt = fileStr.substring(periodIndex);
        if (fileExt.localeCompare(".gpx") === 0) {
            isValid = true;
        }
    }
    var allFiles = document.getElementById("gpx-view-select").options;
    for (var i = 0; i < allFiles.length; i++) {
        if (fileStr.includes(allFiles[i].text) === true) {
            alert("A file with the name '" + allFiles[i].text + "' already exists on the server. File will not be uploaded.");
            console.log("A file with the name '" + allFiles[i].text + "' already exists on the server. File will not be uploaded.");
            return;
        }
    }
    if (isValid == false) { // not valid gpx
        alert("The uploaded file is not a '.gpx' file, and will not be uploaded.");
        console.log("The uploaded file is not a '.gpx' file, and will not be uploaded.");
    }
}

// ----------------------------------------------- DATABASE OPERATIONS (A4) -----------------------------------------------

// Database info - set defaults
let dbConf = {
	host     : 'dursley.socs.uoguelph.ca', // will always be using this host for this assignment
	user     : 'n/a',
	password : 'n/a',
	database : 'n/a'
};

// CONNECT TO DATABASE
document.getElementById("dbconnect-btn").onclick = function() {
    //TODO DISPLAY AN ERROR IN AN ALERT IF IT FAILS TO CONNECT, and PROMPT USER TO ENTER INFO AGAIN
    let username = document.getElementById("dbconnect-username").value;
    let password = document.getElementById("dbconnect-password").value;
    let database = document.getElementById("dbconnect-database").value;

    // check for empty fields
    if (username == null || username.length <= 0 || password == null || password.length <= 0 || database == null || database.length <= 0) {
        alert("You must fill-in all fields to login!");
        return;
    }

    // validate login attempt
    dbConf.user = username;
    dbConf.password = password;
    dbConf.database = database;
    dbConf.host = 'dursley.socs.uoguelph.ca';

    loginToDatabase(dbConf);
}

//TODO IS THIS NEEDED? TODO REMOVE?
// enables all necessary query 5 options when "true" is given as a parameter, and disables them when "false" is given
function query5Selection(hasBeenSelected) {
    if (hasBeenSelected) {
        document.getElementById("query-num-routes-field").disabled = false;
        document.getElementById("query-short-radio").disabled = false;
        document.getElementById("query-long-radio").disabled = false;
    } else {
        document.getElementById("query-num-routes-field").disabled = true;
        document.getElementById("query-short-radio").disabled = true;
        document.getElementById("query-long-radio").disabled = true;
    }
}

function loginToDatabase(dbConf) {
    $.ajax({
        type: "get",
        url: "/loginAttempt",
        dataType: "text",
        data: {host: dbConf.host, user: dbConf.user, password: dbConf.password, database: dbConf.database}, 
        success: function(data) {
            // successful login
            console.log(data);
            //TODO ENABLE ALL NECESSARY DATABASE STUFF
            // enable all necessary database UI elements
            let filesDropdown =  document.getElementById("gpx-view-select");
            if ( filesDropdown && filesDropdown.options.length > 0) { // only if files are on the server
                // Assignment description says "cannot run queries if there are no GPX files on the server", so only enable when files are present
                document.getElementById("store-all-files-btn").disabled = false;
                document.getElementById("query-file-select").disabled = false;
                document.getElementById("query-route-select").disabled = false;
                document.getElementById("query-name-radio").disabled = false;
                document.getElementById("query-length-radio").disabled = false;
                document.getElementById("query1-radio").disabled = false;
                document.getElementById("query2-radio").disabled = false;
                document.getElementById("query3-radio").disabled = false;
                document.getElementById("query4-radio").disabled = false;
                document.getElementById("query5-radio").disabled = false;
                document.getElementById("query-num-routes-field").disabled = false;
                document.getElementById("query-short-radio").disabled = false;
                document.getElementById("query-long-radio").disabled = false;
                document.getElementById("execute-query-btn").disabled = false;
            }
            // enable other database action UI elements
            document.getElementById("clear-all-data-btn").disabled = false;
            document.getElementById("dbstatus-btn").disabled = false;
            
            // TODO FILL FILE SELECTOR AND ROUTE SELECTOR?? AND CLEAR RADIO BUTTONS?
            // SHOW DB STATUS
            getDbStatus(dbConf);
        },
        error: function(error) {
            // display error message
            alert("Error in attempting to connect to the database with the given user information. Please try again.");
            console.log("Error in attempting to connect to the database '" + dbConf.database + "' as user '" + dbConf.user + "': " + error); 
            // reset dbConf to default
            dbConf.user = 'n/a';
            dbConf.password = 'n/a';
            dbConf.database = 'n/a';
        },
        fail: function(error) {
            alert("Failed to connect to the database with the given user information. Please try again.");
            console.log("Failure to connect to the database '" + dbConf.database + "' as user '" + dbConf.user + "': " + error); 
            // reset dbConf to default
            dbConf.user = 'n/a';
            dbConf.password = 'n/a';
            dbConf.database = 'n/a';
        }
    });
}

// STORE ALL FILES
document.getElementById("store-all-files-btn").onclick = async function() {
    //TODO ONLY SUPPOSED TO SHOW/BE ACTIVE IF THERE EXISTS AT LEAST ONE FILE IN THE FILE LOG PANEL
    let fileInfo = [];
    let tableBody = document.getElementById("file-log-table").getElementsByTagName("tbody")[0];
    let rowLength = tableBody.rows.length;
    // remove all rows from tbody first
    for(let i = rowLength - 1; i >= 0; i--) {
        let tableCells = tableBody.rows.item(i).cells;
        let fname = tableCells.item(0).getElementsByTagName("a")[0].innerHTML;
        let ver = tableCells.item(1).innerHTML;
        let crtr = tableCells.item(2).innerHTML;
        // add to array
        fileInfo.push({filename: fname, version: ver, creator: crtr});
    }

    storeAllFiles(dbConf, fileInfo)
}

function storeAllFiles(db, fInfo) {
    $.ajax({
        type: "get",
        url: "/storeFiles",
        dataType: "text",
        data: {dbConf: db, fileInfo: fInfo}, 
        success: function(data) {
            // display success message to console
            console.log(data);
            // SHOW DB STATUS
            getDbStatus(db);
        },
        error: function(error) {
            // display error message
            alert("Error in storing all files in DB: " + error);
            console.log("Failed to store all files in DB: " + error); 
        },
        fail: function(error) {
            alert("Failed to store all files in DB: " + error);
            console.log("Failure to store all files in DB: " + error); 
        }
    });
}

// TRACK ROUTE UPDATES
function trackRouteUpdates() {
    // if not logged-in, don't do anything
    if (dbConf.user.localeCompare('n/a') === 0 && dbConf.password.localeCompare('n/a') === 0 && dbConf.database.localeCompare('n/a') === 0) return;

    // otherwise, simply store all files again, which will update everything, and it clears the db beforehand as well
    document.getElementById("store-all-files-btn").click();
}

// CLEAR ALL DATA
document.getElementById("clear-all-data-btn").onclick = function() {
    // clear the file and route selectors
    let fileSelector = document.getElementById("query-file-select");
    let length = fileSelector.options.length;
    for (let i = length - 1; i >= 0; i--) {
        fileSelector.remove(i);
    }
    let routeSelector = document.getElementById("query-route-select");
    length = routeSelector.options.length;
    for (let i = length - 1; i >= 0; i--) {
        routeSelector.remove(i);
    }
    clearDbData(dbConf);
}

function clearDbData(dbConf) {
    $.ajax({
        type: "get",
        url: "/clearData",
        dataType: "text",
        data: dbConf, 
        success: function(data) {
            // display DB status to console as well
            console.log(data);
            // SHOW DB STATUS
            getDbStatus(dbConf);
        },
        error: function(error) {
            // display error message
            alert("Error in clearing Data in DB: " + error.err);
            console.log("Failed to clear data in DB: " + error.err); 
        },
        fail: function(error) {
            alert("Failed to get DB status: " + error.err);
            console.log("Failure to get DB status: " + error.err); 
        }
    });
}

// DISPLAY DB STATUS
document.getElementById("dbstatus-btn").onclick = function() {
    getDbStatus(dbConf);
}

function getDbStatus(dbConf) {
    $.ajax({
        type: "get",
        url: "/databaseStatus",
        dataType: "json",
        data: dbConf, 
        success: function(data) {
            // display DB status to console as well
            console.log("Database has " + data.numFiles + " file(s), " + data.numRoutes + " route(s), and " + data.numPoints + " point(s)");
            //TODO DATABASE UI ELEMENTS BEING ENABLED IF TABLES CONTAIN DATA IN DB
            // Ensure all Database Operation UI elements are enabled/active ONLY if the tables are filled in the Database
            let filesDropdown =  document.getElementById("gpx-view-select");
            if ( filesDropdown && filesDropdown.options.length > 0) { // only if files are on the server
                // Assignment description says "cannot run queries if there are no GPX files on the server", so only enable when files are present
                document.getElementById("store-all-files-btn").disabled = false;
                document.getElementById("query-file-select").disabled = false;
                document.getElementById("query-route-select").disabled = false;
                document.getElementById("query-name-radio").disabled = false;
                document.getElementById("query-length-radio").disabled = false;
                document.getElementById("query1-radio").disabled = false;
                document.getElementById("query2-radio").disabled = false;
                document.getElementById("query3-radio").disabled = false;
                document.getElementById("query4-radio").disabled = false;
                document.getElementById("query5-radio").disabled = false;
                document.getElementById("query-num-routes-field").disabled = false;
                document.getElementById("query-short-radio").disabled = false;
                document.getElementById("query-long-radio").disabled = false;
                document.getElementById("execute-query-btn").disabled = false;
            }
            // fill query dropdown boxes with the options
            if (data.numFiles > 0 || data.numRoutes > 0 || data.numPoints > 0) fillQueryFileSelect();
            // SHOW DB STATUS
            alert("Database has " + data.numFiles + " file(s), " + data.numRoutes + " route(s), and " + data.numPoints + " point(s)");

        },
        error: function(error) {
            // display error message
            alert("Error in getting DB status");
            console.log("Error in getting DB status:")
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to get DB status");
            console.log("Failure to get DB status:"); 
            console.log(error); 
        }
    });
}

// Listener for when a file is selected in the query file dropdown
document.getElementById("query-file-select").onchange = function() {
    let filename = this.options[this.selectedIndex].text;
    fillQueryRouteSelect(filename);
}

//FILL ROUTE QUERY DROPDOWN
function fillQueryRouteSelect(filename) {
    $.ajax({
        type: "get",
        url: "/fillQueryRouteDropdown",
        dataType: "json",
        data: {db: dbConf, file_name: filename}, 
        success: function(data) {
            //TODO FINISH
            if (data == null) {
                alert("Error in filling Query Route dropdown");
                console.log("Error in filling Query Route dropdown: data given is null");  
                return;
            }
            // clear all options in dropdown first
            let routeSelector = document.getElementById("query-route-select");
            let length = routeSelector.options.length;
            for (let i = length - 1; i >= 0; i--) {
                routeSelector.remove(i);
            }

            // fill the Route Selector dropdown with the given data
            for (let i = 0; i < data.length; i++) {
                let newOption = document.createElement("option");
                newOption.text = "Route " + (i + 1); // start at 1
                newOption.value = data[i].route_id; //TODO SHOULD I SET THE VALUE TO THIS??
                routeSelector.add(newOption);
            }
        },
        error: function(error) {
            // display error message
            alert("Error in filling Query Route dropdown");
            console.log("Error in filling Query Route dropdown:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to fill Query Route dropdown");
            console.log("Failure to fill Query Route dropdown:"); 
            console.log(error); 
        }
    });
}

// FILL FILE QUERY DROPDOWN
function fillQueryFileSelect() {
    $.ajax({
        type: "get",
        url: "/fillQueryFileDropdown",
        dataType: "json",
        data: dbConf, 
        success: function(data) {
            if (data == null) {
                alert("Error in filling Query File dropdown");
                console.log("Error in filling Query File dropdown: data given is null");  
                return;
            }
            // clear all options in dropdown first
            let fileSelector = document.getElementById("query-file-select");
            let length = fileSelector.options.length;
            for (let i = length - 1; i >= 0; i--) {
                fileSelector.remove(i);
            }

            // fill the File Selector dropdown with the given data
            for (let i = 0; i < data.length; i++) {
                let newOption = document.createElement("option");
                newOption.text = data[i].file_name;
                newOption.value = data[i].gpx_id; // set as gpx_id
                fileSelector.add(newOption);
            }
            // fill Route Selector with the routes of the first file
            fillQueryRouteSelect(data[0].file_name);
        },
        error: function(error) {
            // display error message
            alert("Error in filling Query File dropdown");
            console.log("Error in filling Query File dropdown:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to fill Query File dropdown");
            console.log("Failure to fill Query File dropdown:"); 
            console.log(error); 
        }
    });
}

// EXECUTE QUERY
document.getElementById("execute-query-btn").onclick = function() {
    // get sorting option
    let sortingOption = 'n/a';
    if (document.getElementById("query-name-radio").checked) {
        sortingOption = "route_name"; //sort by name
    } else if (document.getElementById("query-length-radio").checked) {
        sortingOption = "route_len"; // sort by length
    }

    if (document.getElementById("query1-radio").checked) { // QUERY 1 SELECTED
        // check if sorting option is checked
        if (sortingOption.localeCompare('n/a') === 0) {
            alert("You must select a sorting option for this Query!");
            return;
        }
        
        query1(dbConf, sortingOption);
    } else if (document.getElementById("query2-radio").checked) { // QUERY 2 SELECTED
        // check if sorting option is checked
        if (sortingOption.localeCompare('n/a') === 0) {
            alert("You must select a sorting option for this Query!");
            return;
        }
        // get selected file
        let gpx_id = document.getElementById("query-file-select").value;
        if (gpx_id == null || gpx_id.length <= 0) {
            alert("You must select a file for this query!");
            return;
        }
        query2(dbConf, gpx_id, sortingOption);
    } else if (document.getElementById("query3-radio").checked) { // QUERY 3 SELECTED
        // get selected route
        let route_id = document.getElementById("query-route-select").value;
        if (route_id == null || route_id.length <= 0) {
            alert("You must select a route for this query!");
            return;
        }
        query3(dbConf, route_id);
    } else if (document.getElementById("query4-radio").checked) { // QUERY 4 SELECTED
        // check if sorting option is checked
        if (sortingOption.localeCompare('n/a') === 0) {
            alert("You must select a sorting option for this Query!");
            return;
        }
        // get selected file
        let gpx_id = document.getElementById("query-file-select").value;
        if (gpx_id == null || gpx_id.length <= 0) {
            alert("You must select a file for this query!");
            return;
        }
        query4(dbConf, gpx_id, sortingOption);
    } else if (document.getElementById("query5-radio").checked) { // QUERY 5 SELECTED
        // get selected file
        let gpx_id = document.getElementById("query-file-select").value;
        if (gpx_id == null || gpx_id.length <= 0) {
            alert("You must select a file for this query!");
            return;
        }
        // check if the file has routes
        let route_id = document.getElementById("query-route-select").value;
        if (route_id == null || route_id.length <= 0) {
            alert("You must select a file that contains at least one route for this query!");
            return;
        }
        // check if sorting option is checked
        if (sortingOption.localeCompare('n/a') === 0) {
            alert("You must select a sorting option for this Query!");
            return;
        }
        // get value from the text field for N
        let userInput = document.getElementById("query-num-routes-field").value;
        if (userInput == null || userInput.length <= 0 || !isValidInteger(userInput)) { // error-check input
            alert("You must give a positive integer for N! (no whitespace allowed)");
            return;
        }
        let num = parseInt(userInput);
        if (num <= 0) {
            alert("You must give a positive integer for N! (no whitespace allowed)");
            return;
        }
        // check for shortest/longest routes
        let shortOrLong = null;
        if (document.getElementById("query-short-radio").checked) {
            shortOrLong = "short"; // get N shortest routes
        } else if (document.getElementById("query-long-radio").checked) {
            shortOrLong = "long"; // get N longest routes
        } else {
            alert("You must select the type of routes that are desired, being the shortest or longest routes!");
            return;
        }
        query5(dbConf, gpx_id, num, shortOrLong, sortingOption);
    } else {
        alert("You must select one of the 5 queries!");
    }
}

// a simple funciton used to validate integers
function isValidInteger(intStr) {
    if (intStr.length === 0) return false;
    // check for any letters in the string
    var hasNum = false;
    for (var i = 0; i < intStr.length; i++) {
        var charCode = intStr.charCodeAt(i);
        if (charCode < 48 || charCode > 57) { // NOT a numerical digit (0-9)
            return false;
        }
    }

    // check parsing
    var intParsed = parseInt(intStr);
    if (isNaN(intParsed)) return false; // not a number

    return true; // valid
}

// QUERY 1 - get data for displaying all routes
function query1(dbConf, sortingMethod) {
    $.ajax({
        type: "get",
        url: "/query1",
        dataType: "json",
        data: {db: dbConf, sort: sortingMethod},  
        success: function(data) {
            if (data == null) {
                alert("Error in getting data for Query 1");
                console.log("Error in getting data for Query 1: data given is null");  
                return;
            }
            
            // make table headings for displaying routes
            let queryViewTable = document.getElementById("query-view-table");
            var tableBody = queryViewTable.getElementsByTagName("tbody")[0];
            var tableHeading = queryViewTable.getElementsByTagName("thead")[0];
            // remove the table headings
            if (tableHeading.rows.length > 0) tableHeading.deleteRow(0); // only one row in heading
            // remove all rows from tbody, and then recalculate row length
            let rowLength = tableBody.rows.length;
            for(let i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }

            // First add table headings
            let row = tableHeading.insertRow(0);
            let cell1 = document.createElement("TH");
            let cell2 = document.createElement("TH");
            let cell3 = document.createElement("TH");
            let cell4 = document.createElement("TH");
            cell1.innerHTML = "route_id";
            cell2.innerHTML = "route_name";
            cell3.innerHTML = "route_len";
            cell4.innerHTML = "gpx_id";
            row.appendChild(cell1);
            row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);

            // Then, add the data to the table
            for (let i = 0; i < data[0].length; i++) {
                let routeJSON = data[0][i];
                rowLength = tableBody.rows.length;
                row = tableBody.insertRow(rowLength);
                // Insert new cells in the empty row
                cell1 = row.insertCell(0);
                cell2 = row.insertCell(1);
                cell3 = row.insertCell(2);
                cell4 = row.insertCell(3);
                cell1.innerHTML = routeJSON.route_id;
                cell2.innerHTML = routeJSON.route_name;
                cell3.innerHTML = routeJSON.route_len;
                cell4.innerHTML = routeJSON.gpx_id;
            }
        },
        error: function(error) {
            // display error message
            alert("Error in displaying all routes from DB");
            console.log("Error in displaying all routes from DB:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to display all routes from DB");
            console.log("Failure to display all routes from DB:"); 
            console.log(error); 
        }
    });
}

// QUERY 2 - get all routes from a specified file
function query2(dbConf, gpxId, sortingOption) {
    $.ajax({
        type: "get",
        url: "/query2",
        dataType: "json",
        data: {db: dbConf, gpx_id: gpxId, sort: sortingOption},  
        success: function(data) {
            if (data == null) {
                alert("Error in getting data for Query 2");
                console.log("Error in getting data for Query 2: data given is null");  
                return;
            }
            
            // make table headings for displaying routes
            let queryViewTable = document.getElementById("query-view-table");
            var tableBody = queryViewTable.getElementsByTagName("tbody")[0];
            var tableHeading = queryViewTable.getElementsByTagName("thead")[0];
            // remove the table headings
            if (tableHeading.rows.length > 0) tableHeading.deleteRow(0); // only one row in heading
            // remove all rows from tbody, and then recalculate row length
            let rowLength = tableBody.rows.length;
            for(let i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }

            // First add table headings
            let row = tableHeading.insertRow(0);
            let cell1 = document.createElement("TH");
            let cell2 = document.createElement("TH");
            let cell3 = document.createElement("TH");
            let cell4 = document.createElement("TH");
            let cell5 = document.createElement("TH");
            cell1.innerHTML = "file_name";
            cell2.innerHTML = "route_id";
            cell3.innerHTML = "route_name";
            cell4.innerHTML = "route_len";
            cell5.innerHTML = "gpx_id";
            row.appendChild(cell1);
            row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);
            row.appendChild(cell5);

            // Then, add the data to the table
            for (let i = 0; i < data.routes.length; i++) {
                let routeJSON = data.routes[i];
                rowLength = tableBody.rows.length;
                row = tableBody.insertRow(rowLength);
                // Insert new cells in the empty row
                cell1 = row.insertCell(0);
                cell2 = row.insertCell(1);
                cell3 = row.insertCell(2);
                cell4 = row.insertCell(3);
                cell5 = row.insertCell(4);
                cell1.innerHTML = data.file_name;
                cell2.innerHTML = routeJSON.route_id;
                cell3.innerHTML = routeJSON.route_name;
                cell4.innerHTML = routeJSON.route_len;
                cell5.innerHTML = routeJSON.gpx_id;
            }
        },
        error: function(error) {
            // display error message
            alert("Error in displaying all routes from DB");
            console.log("Error in displaying all routes from DB:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to display all routes from DB");
            console.log("Failure to display all routes from DB:"); 
            console.log(error); 
        }
    });
}

// QUERY 3 - display all points of a specified route, ordered by point index
function query3(dbConf, routeId) {
    $.ajax({
        type: "get",
        url: "/query3",
        dataType: "json",
        data: {db: dbConf, route_id: routeId},  
        success: function(data) {
            if (data == null) {
                alert("Error in getting data for Query 3");
                console.log("Error in getting data for Query 3: data given is null");  
                return;
            }

            // make table headings for displaying routes
            let queryViewTable = document.getElementById("query-view-table");
            var tableBody = queryViewTable.getElementsByTagName("tbody")[0];
            var tableHeading = queryViewTable.getElementsByTagName("thead")[0];
            // remove the table headings
            if (tableHeading.rows.length > 0) tableHeading.deleteRow(0); // only one row in heading
            // remove all rows from tbody, and then recalculate row length
            let rowLength = tableBody.rows.length;
            for(let i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }

            // First add table headings
            let row = tableHeading.insertRow(0);
            let cell1 = document.createElement("TH");
            let cell2 = document.createElement("TH");
            let cell3 = document.createElement("TH");
            let cell4 = document.createElement("TH");
            let cell5 = document.createElement("TH");
            let cell6 = document.createElement("TH");
            cell1.innerHTML = "point_id";
            cell2.innerHTML = "point_index";
            cell3.innerHTML = "latitude";
            cell4.innerHTML = "longitude";
            cell5.innerHTML = "point_name";
            cell6.innerHTML = "route_id";
            row.appendChild(cell1);
            row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);
            row.appendChild(cell5);
            row.appendChild(cell6);

            // Then, add the data to the table
            for (let i = 0; i < data[0].length; i++) {
                let pointJSON = data[0][i];
                rowLength = tableBody.rows.length;
                row = tableBody.insertRow(rowLength);
                // Insert new cells in the empty row
                cell1 = row.insertCell(0);
                cell2 = row.insertCell(1);
                cell3 = row.insertCell(2);
                cell4 = row.insertCell(3);
                cell5 = row.insertCell(4);
                cell6 = row.insertCell(5);
                cell1.innerHTML = pointJSON.point_id;
                cell2.innerHTML = pointJSON.point_index;
                cell3.innerHTML = "" + pointJSON.latitude;
                cell4.innerHTML = "" + pointJSON.longitude;
                if (pointJSON.point_name == null) cell5.innerHTML = " ";
                else cell5.innerHTML = pointJSON.point_name;
                cell6.innerHTML = pointJSON.route_id;
            }
        },
        error: function(error) {
            // display error message
            alert("Error in displaying all points in given route");
            console.log("Error in displaying all points in given route:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to display all points in given route");
            console.log("Failure to display all points in given route:"); 
            console.log(error); 
        }
    });
}

// QUERY 4 - display all points of a specified file, with routes ordered with specified option, and points in each route ordered by point index
function query4(dbConf, gpxId, sortingOption) {
    $.ajax({
        type: "get",
        url: "/query4",
        dataType: "json",
        data: {db: dbConf, gpx_id: gpxId, sort: sortingOption},  
        success: function(data) {
            if (data == null) {
                alert("Error in getting data for Query 4");
                console.log("Error in getting data for Query 4: data given is null");  
                return;
            }

            // make table headings for displaying routes
            let queryViewTable = document.getElementById("query-view-table");
            var tableBody = queryViewTable.getElementsByTagName("tbody")[0];
            var tableHeading = queryViewTable.getElementsByTagName("thead")[0];
            // remove the table headings
            if (tableHeading.rows.length > 0) tableHeading.deleteRow(0); // only one row in heading
            // remove all rows from tbody, and then recalculate row length
            let rowLength = tableBody.rows.length;
            for(let i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }

            // First add table headings
            let row = tableHeading.insertRow(0);
            let cell1 = document.createElement("TH");
            let cell2 = document.createElement("TH");
            let cell3 = document.createElement("TH");
            let cell4 = document.createElement("TH");
            let cell5 = document.createElement("TH");
            let cell6 = document.createElement("TH");
            let cell7 = document.createElement("TH");
            cell1.innerHTML = "route_name"
            cell2.innerHTML = "point_id";
            cell3.innerHTML = "point_index";
            cell4.innerHTML = "latitude";
            cell5.innerHTML = "longitude";
            cell6.innerHTML = "point_name";
            cell7.innerHTML = "route_id";
            row.appendChild(cell1);
            row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);
            row.appendChild(cell5);
            row.appendChild(cell6);
            row.appendChild(cell7);

            // Then, add the data to the table
            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < data[i].points.length; j++) {
                    let pointJSON = data[i].points[j];
                    rowLength = tableBody.rows.length;
                    row = tableBody.insertRow(rowLength);
                    // Insert new cells in the empty row
                    cell1 = row.insertCell(0);
                    cell2 = row.insertCell(1);
                    cell3 = row.insertCell(2);
                    cell4 = row.insertCell(3);
                    cell5 = row.insertCell(4);
                    cell6 = row.insertCell(5);
                    cell7 = row.insertCell(6);
                    cell1.innerHTML = data[i].route_name;
                    cell2.innerHTML = pointJSON.point_id;
                    cell3.innerHTML = pointJSON.point_index;
                    cell4.innerHTML = "" + pointJSON.latitude;
                    cell5.innerHTML = "" + pointJSON.longitude;
                    if (pointJSON.point_name == null) cell6.innerHTML = " ";
                    else cell6.innerHTML = pointJSON.point_name;
                    cell7.innerHTML = pointJSON.route_id;
                }
            }
        },
        error: function(error) {
            // display error message
            alert("Error in displaying all points in given file");
            console.log("Error in displaying all points in given file:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to display all points in given file");
            console.log("Failure to display all points in given file:"); 
            console.log(error); 
        }
    });
}

// QUERY 5 - get data for displaying N shortest/longest routes from a specified file, sorted by the chosen option
function query5(dbConf, gpxId, n, shortOrLong, sortingMethod) {
    $.ajax({
        type: "get",
        url: "/query5",
        dataType: "json",
        data: {db: dbConf, gpx_id: gpxId, num: n, type: shortOrLong, sort: sortingMethod},  
        success: function(data) {
            if (data == null) {
                alert("Error in getting data for Query 1");
                console.log("Error in getting data for Query 1: data given is null");  
                return;
            }
            
            // make table headings for displaying routes
            let queryViewTable = document.getElementById("query-view-table");
            var tableBody = queryViewTable.getElementsByTagName("tbody")[0];
            var tableHeading = queryViewTable.getElementsByTagName("thead")[0];
            // remove the table headings
            if (tableHeading.rows.length > 0) tableHeading.deleteRow(0); // only one row in heading
            // remove all rows from tbody, and then recalculate row length
            let rowLength = tableBody.rows.length;
            for(let i = rowLength - 1; i >= 0; i--) {
                tableBody.deleteRow(i);
            }

            // First add table headings
            let row = tableHeading.insertRow(0);
            let cell1 = document.createElement("TH");
            let cell2 = document.createElement("TH");
            let cell3 = document.createElement("TH");
            let cell4 = document.createElement("TH");
            let cell5 = document.createElement("TH");
            cell1.innerHTML = "file_name";
            cell2.innerHTML = "route_id";
            cell3.innerHTML = "route_name";
            cell4.innerHTML = "route_length";
            cell5.innerHTML = "gpx_id";
            row.appendChild(cell1);
            row.appendChild(cell2);
            row.appendChild(cell3);
            row.appendChild(cell4);
            row.appendChild(cell5);

            // //get filename (OLD WAY)
            // let fileSelect = document.getElementById("query-file-select");
            // let file_name = fileSelect.options[fileSelect.selectedIndex].text;
            // console.log("FILE NAME = '" + file_name + "'");

            // Then, add the data to the table
            for (let i = 0; i < data.routes.length; i++) {
                let routeJSON = data.routes[i];
                rowLength = tableBody.rows.length;
                row = tableBody.insertRow(rowLength);
                // Insert new cells in the empty row
                cell1 = row.insertCell(0);
                cell2 = row.insertCell(1);
                cell3 = row.insertCell(2);
                cell4 = row.insertCell(3);
                cell5 = row.insertCell(4);
                cell1.innerHTML = data.file_name;
                cell2.innerHTML = routeJSON.route_id;
                cell3.innerHTML = routeJSON.route_name;
                cell4.innerHTML = routeJSON.route_len;
                cell5.innerHTML = routeJSON.gpx_id;
            }
        },
        error: function(error) {
            // display error message
            alert("Error in displaying all routes from DB");
            console.log("Error in displaying all routes from DB:"); 
            console.log(error); 
        },
        fail: function(error) {
            alert("Failed to display all routes from DB");
            console.log("Failure to display all routes from DB:"); 
            console.log(error); 
        }
    });
}

// set-up custom listener for N field for Query 5
document.getElementById("query-num-routes-field")
.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("execute-query-btn").click();
    }
});