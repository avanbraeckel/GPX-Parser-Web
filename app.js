'use strict'

// C library API
const ffi = require('ffi-napi');

// Express App (Routes)
const express = require("express");
const app     = express();
const path    = require("path");
const fileUpload = require('express-fileupload');

app.use(fileUpload());
app.use(express.static(path.join(__dirname+'/uploads')));

// Minimization
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { RSA_PKCS1_OAEP_PADDING } = require('constants');
const { query } = require('express');

// Important, pass in port as in `npm run dev 1234`, do not change
const portNum = process.argv[2];

// Send HTML at root, do not change
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/public/index.html'));
});

// Send Style, do not change
app.get('/style.css',function(req,res){
  //Feel free to change the contents of style.css to prettify your Web app
  res.sendFile(path.join(__dirname+'/public/style.css'));
});

// Send obfuscated JS, do not change
app.get('/index.js',function(req,res){
  fs.readFile(path.join(__dirname+'/public/index.js'), 'utf8', function(err, contents) {
    const minimizedContents = JavaScriptObfuscator.obfuscate(contents, {compact: true, controlFlowFlattening: true});
    res.contentType('application/javascript');
    res.send(minimizedContents._obfuscatedCode);
  });
});

//Respond to POST requests that upload files to uploads/ directory
app.post('/upload', function(req, res) {
  if(!req.files) {
    res.send('No files were uploaded.');
    return;
  }
 
  let uploadFile = req.files.uploadFile;
  let files = fs.readdirSync("./uploads/");

  for (var i = 0; i < files.length; i++) {
    if (files[i].localeCompare(req.files.uploadFile.name) === 0) {
        res.send("File not uploaded - A file with the name '" + req.files.uploadFile.name + "' already exists on the server.");
        return;
    }
  }

    // Use the mv() method to place the file somewhere on your server
    uploadFile.mv('uploads/' + uploadFile.name, function(err) {
        if(err) {
            res.status(500).send(err);
            return;
        }

        res.redirect('/');
    });
});

//Respond to GET requests for files in the uploads/ directory
app.get('/uploads/:name', function(req , res){
  fs.stat('uploads/' + req.params.name, function(err, stat) {
    if(err == null) {
      res.sendFile(path.join(__dirname+'/uploads/' + req.params.name));
    } else {
      console.log('Error in file downloading route: '+err);
      res.send('');
    }
  });
});

//******************** Your code goes here ******************** 

// Set up functions from shared library
let sharedLib = ffi.Library('./libgpxparser.so', {
    //NOTE: return type first, argument list second (leave empty if no parameters are taken)
    'getGpxSummary' : [ 'string', [ 'string' ] ],
    'getGpxViewData' : [ 'string', [ 'string' ] ],
    'getOtherDataJSON' : [ 'string', [ 'string', 'string' ] ],
    'renameRteOrTrk' : [ 'bool', ['string', 'string', 'string'] ],
    'createGpxWithFilename' : [ 'bool', ['string', 'string'] ],
    'addRouteToFile' : [ 'bool', ['string', 'string', 'string'] ],
    'findPathsInFile' : [ 'string', ['string', 'string'] ],
    'getNumRtesAndTrksWithLength' : [ 'string', ['string', 'string'] ],
    'getPointData' : [ 'string', ['string', 'string'] ] 
});

// send icon from public folder
app.get('/favicon.ico',function(req,res){
    res.sendFile(path.join(__dirname+'/public/favicon.ico'));
});

// retrieves a list of uploaded files on the server
app.get("/getUploadFiles", function(req, res) {
    let list = fs.readdirSync("./uploads/");
    res.send(JSON.parse(JSON.stringify(list)));
});

// used to fill the file log panel table
app.get('/fileLogTable', function(req, res) {
    let files = fs.readdirSync("./uploads/");
    let gpxSummaryJSON = [];

    for(var i = 0; i < files.length; i++) {
        // verify that it is a .gpx file
        var periodIndex = files[i].indexOf(".");
        var isValid = false;
        if (periodIndex != -1) {
            var fileExt = files[i].substring(periodIndex);
            if (fileExt.localeCompare(".gpx") === 0) {
                isValid = true;
            }
        }

        var rowJSONstr = null;
        if (isValid === true) {
            rowJSONstr = sharedLib.getGpxSummary("./uploads/" + files[i]);
        }

        // make sure file was valid
        if(rowJSONstr != null && isValid === true) { // null indicates an invalid file
            var rowJSON = [ { filename: files[i], valid: true }, JSON.parse(rowJSONstr) ];
            gpxSummaryJSON.push(rowJSON);
        } else {
            gpxSummaryJSON.push( [ {filename: files[i], valid: false} ] );
            // delete the invalid file
            fs.unlinkSync("./uploads/" + files[i]);
        }        
    }
    res.send( gpxSummaryJSON );
});

// get JSON for the GPX View Panel
app.get('/viewGpx', function(req, res) {
    var gpxViewJSON = sharedLib.getGpxViewData("./uploads/" + req.query.filename);

    // make sure file was valid
    if(gpxViewJSON != null) {
        res.send( JSON.parse(gpxViewJSON) );
    } else {
        res.status(400).send("Error: '" + req.query.filename + "' is invalid.");
    }
});

// get JSON for "other data" of the GPX View Panel file
app.get('/viewGpxOtherData', function(req, res) {
    var gpxViewJSON = sharedLib.getOtherDataJSON("./uploads/" + req.query.filename, req.query.selection);
    // make sure file was valid
    if(gpxViewJSON != null) {
        res.send( JSON.parse(gpxViewJSON) );
    } else {
        res.status(400).send("Error: '" + req.query.filename + "' is invalid.");
    }
});

// rename the selected route or track with the specified name
app.get('/viewGpxRename', function(req, res) {
    var gpxViewJSON = sharedLib.renameRteOrTrk("./uploads/" + req.query.filename, req.query.selection, req.query.newName);
    // make sure file was valid
    if(gpxViewJSON != false) {
        res.send("Successfully changed name of " + req.query.selection + " in '" + req.query.filename + "' to '" + req.query.newName + "'.");
    } else {
        res.status(400).send("Error: '" + req.query.filename + "' is invalid.");
    }
});

app.get('/createGPX', function(req, res) {
    // first, check if the file name conflicts with any others
    let files = fs.readdirSync("./uploads/");
    //check for validity of the name (common ones first)
    if (req.query.length === 0 || req.query.filename.includes(" ") || req.query.filename.includes(".") || req.query.filename.includes("/") || req.query.filename.includes('"')) {
        res.send("The file name '" + req.query.filename + "' must have a length greater than 0 and only include letters, numbers, hyphens, and underscores.");
        return;
    }

    // check that all characters are either alphanumeric, an underscore ('_'), or a hyphen/dash ('-')
    for (var i = 0; i < req.query.filename.length; i++) {
        var charCode = req.query.filename.charCodeAt(i);
        if ( !(charCode == 45 // hyphen/dash '-'
                || charCode == 95 // underscore '_'
                || (charCode >= 48 && charCode <= 57) // 0-9 (numbers)
                || (charCode >= 65 && charCode <= 90) // A-Z (capital letters)
                || (charCode >= 97 && charCode <= 122)) ) { // a-z (lowercase letters)
            // invalid characters used
            res.send("The file name '" + req.query.filename + "' must have a length greater than 0 and only include letters, numbers, hyphens, and underscores.");
            return;
        }
    }

    // check if there are any file name conflicts on the server with this given name
    for (var i = 0; i < files.length; i++) {
        if (files[i].localeCompare(req.query.filename + ".gpx") === 0) {
            res.send("A file with the name '" + req.query.filename + ".gpx' already exists on the server. Please choose a different name.");
            return;
        }
    }
    
    var gpxVersionFloat = parseFloat(req.query.version);
    if (gpxVersionFloat != 1.1) { // check if the parsing was unsuccessful, and if it is the correct version
        res.send("Currently, only version 1.1 is supported, and you entered '" + req.query.version + "'.");
        return;
    }
    var gpxJSON = {version:gpxVersionFloat,creator:req.query.creator}; // set-up object to pass into the C function below

    var isValid = sharedLib.createGpxWithFilename(req.query.filename, JSON.stringify(gpxJSON));

    // make sure file was valid
    if(isValid === true) {
        res.send("Successfully created GPX document called '" + req.query.filename + "'.");
    } else {
        res.status(400).send("Error: '" + req.query.filename + "' is invalid.");
    }
});

// Add a route to the given file with the given route data
app.get('/addRoute', function(req, res) {
    var isValid = sharedLib.addRouteToFile("./uploads/" + req.query.filename, req.query.route, req.query.name);
    // make sure file was valid
    if(isValid != false) {
        res.send("Successfully added Route to '" + req.query.filename + "'.");
    } else {
        res.status(400).send("Error: given JSON string has invalid data or format.");
    }
});

// Finds and returns paths that connect the given waypoints
app.get('/findPath', function(req, res) {
    var allValidJSON = []; // empty list
    let files = fs.readdirSync("./uploads/");
    
    //loop through the files on the server
    for (var i = 0; i < files.length; i++) {
        // verify that it is a .gpx file
        var periodIndex = files[i].indexOf(".");
        var isValid = false;
        if (periodIndex != -1) {
            var fileExt = files[i].substring(periodIndex);
            if (fileExt.localeCompare(".gpx") === 0) {
                isValid = true;
            }
        }
        if (isValid == true) { // only search .gpx files
            var validRtesAndTrks = sharedLib.findPathsInFile("./uploads/" + files[i], req.query.JSONstr);
            if (validRtesAndTrks == null) {
                res.status(400).send("Error while searching for paths within '" + files[i] + "'");
            } else if (validRtesAndTrks.localeCompare("{\"routes\":[],\"tracks\":[]}") != 0) { // at least one valid path in the file
                var parsedJSON = JSON.parse(validRtesAndTrks);
                parsedJSON.filename = files[i]; // store filename for later use
                if (parsedJSON.routes.length > 0 || parsedJSON.tracks.length > 0) {
                    allValidJSON.push(parsedJSON); // add them to the final list of valid paths
                }
            }
        }
    }

    res.send(allValidJSON);
    // shouldn't be any errors since we are going through valid gpx files only
});

app.get('/getNumWithLength', function(req, res) {
    var numRtesAndTrks = {
        routes: 0,
        tracks: 0
    };
    let files = fs.readdirSync("./uploads/");
    
    //loop through the files on the server
    for (var i = 0; i < files.length; i++) {
        // verify that it is a .gpx file
        var periodIndex = files[i].indexOf(".");
        var isValid = false;
        if (periodIndex != -1) {
            var fileExt = files[i].substring(periodIndex);
            if (fileExt.localeCompare(".gpx") === 0) {
                isValid = true;
            }
        }
        if (isValid == true) { // only search .gpx files
            var validRtesAndTrks = sharedLib.getNumRtesAndTrksWithLength("./uploads/" + files[i], "" + req.query.len);
            if (validRtesAndTrks == null) {
                res.status(400).send("Error while searching for routes and tracks within '" + files[i] + "'");
            } else { 
                var parsedJSON = JSON.parse(validRtesAndTrks);
                if (parsedJSON.routes > 0) {
                    numRtesAndTrks.routes += parsedJSON.routes;
                }
                if (parsedJSON.tracks > 0) {
                    numRtesAndTrks.tracks += parsedJSON.tracks;
                }
            }
        }
    }

    res.send(numRtesAndTrks);
    // shouldn't be any errors since we are going through valid gpx files only
});

// -------------------------------------- DATABASE OPERATIONS (A4) --------------------------------------

// Attempt to login to the database
app.get('/loginAttempt', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        // create FILE table, ROUTE table, and POINT table if they don't exist
        await connection.execute("CREATE TABLE IF NOT EXISTS FILE (gpx_id INT AUTO_INCREMENT PRIMARY KEY, "
                + "file_name VARCHAR(60) NOT NULL, ver DECIMAL(2,1) NOT NULL, creator VARCHAR(256) NOT NULL)");
        await connection.execute("CREATE TABLE IF NOT EXISTS ROUTE (route_id INT AUTO_INCREMENT PRIMARY KEY, "
                + "route_name VARCHAR(256), route_len FLOAT(15,7) NOT NULL, gpx_id INT NOT NULL, "
                + "FOREIGN KEY(gpx_id) REFERENCES FILE (gpx_id) ON DELETE CASCADE)");
        await connection.execute("CREATE TABLE IF NOT EXISTS POINT (point_id INT AUTO_INCREMENT PRIMARY KEY, "
                + "point_index INT NOT NULL, latitude DECIMAL(11,7) NOT NULL, longitude DECIMAL(11,7) NOT NULL, "
                + "point_name VARCHAR(256), route_id INT NOT NULL, FOREIGN KEY(route_id) REFERENCES ROUTE (route_id) ON DELETE CASCADE)");

        // successful login
        res.send("Successfully logged into database '" + dbObj.database + "' as user '" + dbObj.user + "'.");
    } catch (e) {
        console.log(e);
        res.status(400).send("error when attempting to login to the database - " + e);
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// Store all files on the server in the DB
app.get('/storeFiles', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.dbConf;
    let infoObj = req.query.fileInfo;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);

        //TODO MAKE SURE I AM NOT DUPLICATING DATA - AND IS THIS THE RIGHT ORDER?
        // clear all tables and reset increment to 0
        await connection.execute("DELETE FROM POINT");
        await connection.execute("ALTER TABLE POINT AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM ROUTE");
        await connection.execute("ALTER TABLE ROUTE AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM FILE");
        await connection.execute("ALTER TABLE FILE AUTO_INCREMENT=0");

        //TODO DOING IT TWICE SEEMS TO RESET IT BETTER... MUST BE WRONG ORDER?
        await connection.execute("DELETE FROM POINT");
        await connection.execute("ALTER TABLE POINT AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM ROUTE");
        await connection.execute("ALTER TABLE ROUTE AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM FILE");
        await connection.execute("ALTER TABLE FILE AUTO_INCREMENT=0");
        // TODO AM I ALLOWED TO CLEAR THE DATABASE FIRST LIKE THIS?

        // Go through each file
        for (let i = 0; i < infoObj.length; i++) {
            // add to FILE table
            await connection.execute("INSERT INTO FILE VALUES (null, '" + infoObj[i].filename
                + "', " + infoObj[i].version + ", '" + infoObj[i].creator + "') ");
            
            // get and add info to ROUTE table
            let gpxViewData = sharedLib.getGpxViewData("./uploads/" + infoObj[i].filename);
            if (gpxViewData == null) { // check that it is valid
                console.log("Error when getting data for ROUTE table");
                res.status(400).send({err: "Error when attempting store files in DB: getting data for ROUTE table was unsuccessful"});
                if (connection && connection.end) connection.end();
                return;
            } // otherwise insert data to ROUTE table
            let routeData = JSON.parse(gpxViewData).routes;
            if (routeData != null && routeData.length > 0) { // only add routes if they exist
                // First, get gpx_id for the corresponding file
                let gpx_id_output = await connection.execute("SELECT MAX(FILE.gpx_id) AS 'gpxId' FROM FILE");
                let gpx_id = gpx_id_output[0][0].gpxId;

                //? OLD WAY BELOW - IS IT BETTER?
                //let test_output = await connection.execute("SELECT DISTINCT FILE.gpx_id FROM FILE WHERE FILE.file_name = '"
                //         + infoObj[i].filename + "'");;
                //let test = test_output[0][0].gpx_id;

                // go through all routes to add them to ROUTE
                for (let j = 0; j < routeData.length; j++) {
                    let route_name = "null"; //default NULL (if name is missing)
                    if (routeData[j].name.localeCompare("None") != 0) { // Has a name
                        route_name = "'" + routeData[j].name + "'";
                    } 
                    // add to ROUTE table
                    await connection.execute("INSERT INTO ROUTE VALUES (null, " + route_name
                        + ", " + routeData[j].len + ", " + gpx_id + ")");
                        
                    // get route id before adding to POINT
                    let route_id_output = await connection.execute("SELECT MAX(ROUTE.route_id) AS 'routeId' FROM ROUTE");
                    let route_id = route_id_output[0][0].routeId;
                    // go through all route points to add them to POINT
                    let pointDataStr = sharedLib.getPointData("./uploads/" + infoObj[i].filename, "" + j);
                    if (pointDataStr == null) {
                        console.log("Error when trying to get data for POINT");
                        res.status(400).send("Error when trying to get data for POINT");
                    }
                    let pointDataJSON = JSON.parse(pointDataStr);
                    // fill POINT table with the information from current Route
                    for (let k = 0; k < pointDataJSON.length; k++) {
                        if (pointDataJSON[k].point_name != null) {
                            pointDataJSON[k].point_name = "'" + pointDataJSON[k].point_name + "'";
                        }
                        await connection.execute("INSERT INTO POINT VALUES (null, " + pointDataJSON[k].point_index
                                + ", " + pointDataJSON[k].latitude + ", " + pointDataJSON[k].longitude + ", "
                                + pointDataJSON[k].point_name + ", " + route_id + ")")
                    }
                }
            }
        }

        // successful clear
        res.send("All files stored successfully");
    } catch (e) {
        console.log(e);
        res.status(400).send("Error when storing files in DB: " + e);
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// Clear all data in the DB
app.get('/clearData', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);

        // clear all tables and reset increment to 0
        await connection.execute("DELETE FROM POINT");
        await connection.execute("ALTER TABLE POINT AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM ROUTE");
        await connection.execute("ALTER TABLE ROUTE AUTO_INCREMENT=0");
        await connection.execute("DELETE FROM FILE");
        await connection.execute("ALTER TABLE FILE AUTO_INCREMENT=0");

        //TODO FINISH/CHECK IF IT IS CORRECT
        // successful clear
        res.send("Data cleared successfully");
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to clear DB: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});


// Display DB status
app.get('/databaseStatus', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);

        let fileCount = await connection.execute("SELECT * FROM FILE");
        let routeCount = await connection.execute("SELECT * FROM ROUTE");
        let pointCount = await connection.execute("SELECT * FROM POINT");
        // successful display of status
        res.send({numFiles: fileCount[0].length, numRoutes: routeCount[0].length, numPoints: pointCount[0].length});
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get DB status: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// Fill query file dropdown
app.get('/fillQueryFileDropdown', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);

        // FILL FILE DROPDOWN
        let fileCount = await connection.execute("SELECT DISTINCT FILE.file_name, FILE.gpx_id FROM FILE");
        let fileNamesList = [];
        for (let i = 0; i < fileCount[0].length; i++) {
            fileNamesList.push({file_name: fileCount[0][i].file_name, gpx_id: fileCount[0][i].gpx_id});
        }

        // successful
        res.send(fileNamesList);
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to fill query file dropdown: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// Fill query route dropdown
app.get('/fillQueryRouteDropdown', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let file_name = req.query.file_name;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        // FILL FILE DROPDOWN
        let gpxIdOutput = await connection.execute("SELECT FILE.gpx_id FROM FILE WHERE FILE.file_name='" + file_name + "'");
        let gpx_id = gpxIdOutput[0][0].gpx_id;
        let routesListOutput = await connection.execute("SELECT * FROM ROUTE WHERE ROUTE.gpx_id=" + gpx_id);
        
        let routeIdList = [];
        for (let i = 0; i < routesListOutput[0].length; i++) {
            routeIdList.push({route_id: routesListOutput[0][i].route_id});
        }

        // successful
        res.send(routeIdList);
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get data to fill query route dropdown: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// QUERY 1 - display all routes
app.get('/query1', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let sort = req.query.sort;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        let routeList;
        // if (sort.localeCompare("route_name") === 0) {
            routeList = await connection.execute("SELECT * FROM ROUTE ORDER BY ROUTE." + sort);
        // } else { // sorted by length (we want it in descending order) //TODO IS THIS NECESSARY?
        //     routeList = await connection.execute("SELECT * FROM ROUTE ORDER BY ROUTE." + sort + " DESC");
        // }

        // successful
        res.send(routeList);
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get all routes from DB for query 1: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// QUERY 2 - display all routes from a specified file
app.get('/query2', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let gpx_id = req.query.gpx_id;
    let sort = req.query.sort;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        // get filename
        let filenameOutput = await connection.execute("SELECT FILE.file_name FROM FILE WHERE FILE.gpx_id=" + gpx_id);
        let filename = filenameOutput[0][0].file_name;

        // get routes
        let routeList = await connection.execute("SELECT * FROM ROUTE WHERE ROUTE.gpx_id= " + gpx_id
                + " ORDER BY ROUTE." + sort);

        // successful
        res.send({file_name: filename, routes: routeList[0]});
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get all routes from file (id = " + gpx_id + ") for query 2: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// QUERY 3 - display all points from a specified route
app.get('/query3', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let route_id = req.query.route_id;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        let pointList = await connection.execute("SELECT * FROM POINT WHERE POINT.route_id=" + route_id
                + " ORDER BY POINT.point_index");

        // successful
        res.send(pointList);
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get all points from route (id = " + route_id + ") for query 3: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// QUERY 4 - display all points from a specified file
app.get('/query4', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let gpx_id = req.query.gpx_id;
    let sort = req.query.sort;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        // first, get list of routes from the specified file in order specified by "sort"
        let routeList = await connection.execute("SELECT * FROM ROUTE WHERE ROUTE.gpx_id=" + gpx_id + " ORDER BY ROUTE." + sort);
        let numUnnamedRoutes = 0;
        let outputList = [];
        for (let i = 0; i < routeList[0].length; i++) {
            let route_id = routeList[0][i].route_id;
            // give unnamed routes a name //TODO USE THIS SOMEWHERE???
            let routeName = routeList[0][i].route_name;
            if (routeName == null || routeName.length <= 0 || routeName.localeCompare("NULL") === 0 || routeName.localeCompare("null") === 0) {
                routeName = "Unnamed route " + (numUnnamedRoutes + 1);
                numUnnamedRoutes++;
            }
            let pointList = await connection.execute("SELECT * FROM POINT WHERE POINT.route_id=" + route_id + " ORDER BY POINT.point_index");
            outputList.push({route_name: routeName, points: pointList[0]});
        }

        // successful
        res.send(outputList);
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get all points from file (id = " + gpx_id + ") for query 4: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

// QUERY 5 - display N shortest/longest routes from a specified file
app.get('/query5', async function(req, res) {
    const mysql = require('mysql2/promise');
    let connection;
    let dbObj = req.query.db;
    let gpx_id = req.query.gpx_id;
    let sort = req.query.sort;
    let type = req.query.type;
    let num = req.query.num;
    try {
        // create connection
        connection = await mysql.createConnection(dbObj);
        
        let descendingStr = "";
        if (type.localeCompare("long") === 0) { // get longest
            descendingStr = "DESC ";
        } // otherwise, get shortest, so "DESC" isn't needed

        // get filename
        let filenameOutput = await connection.execute("SELECT FILE.file_name FROM FILE WHERE FILE.gpx_id=" + gpx_id);
        let filename = filenameOutput[0][0].file_name;

        // get n shortest/longest routes' id numbers
        let routeList = await connection.execute("SELECT ROUTE.route_id FROM ROUTE WHERE ROUTE.gpx_id= " + gpx_id
                + " ORDER BY ROUTE.route_len " + descendingStr + "LIMIT " + num);
        // get all specific routes in order
        let sqlComplexCommand = "SELECT * FROM ROUTE WHERE ";
        for (let i = 0; i < routeList[0].length; i++) {
            let route_id = routeList[0][i].route_id;
            if (i < routeList[0].length - 1) { // not last iteration
                sqlComplexCommand += "ROUTE.route_id=" + route_id + " OR ";
            } else { // last iteration
                sqlComplexCommand += "ROUTE.route_id=" + route_id + " ";
            }
        }
        sqlComplexCommand += "ORDER BY ROUTE." + sort;

        // execute complex command to get output list
        let outputList = await connection.execute(sqlComplexCommand);

        // successful
        res.send({file_name: filename, routes: outputList[0]});
    } catch (e) {
        console.log(e);
        res.status(400).send({err: "Error when attempting to get " + num + " shortest/longest routes from file (id = " + gpx_id + ") for query 5: " + e});
    } finally {
        // close the connection if it is still open
        if (connection && connection.end) connection.end();
    }
});

app.listen(portNum);
console.log('Running app at localhost: ' + portNum);