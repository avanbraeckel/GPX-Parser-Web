/**
 * Austin Van Braeckel - avanbrae@uoguelph.ca - 1085829
 * 2021-02-04
 * CIS2750 A1 - A parser for GPX files.
 * Code was partly based on the example (libXmlExample.c) given for XML Parsing for this Assignment.
 */

#include "GPXParser.h"
#include "GPXParserHelpers.h"

/** Function to create an GPX object based on the contents of an GPX file.
 *@pre File name cannot be an empty string or NULL.
       File represented by this name must exist and must be readable.
 *@post Either:
        A valid GPXdoc has been created and its address was returned
		or 
		An error occurred, and NULL was returned
 *@return the pinter to the new struct or NULL
 *@param fileName - a string containing the name of the GPX file
**/
GPXdoc* createGPXdoc(char* fileName) {
    if (fileName == NULL || !(strlen(fileName) > 0)) return NULL;

    xmlDoc *doc;
    GPXdoc *gpx;
    xmlNode *root;
    // Read given file
    if ((doc = xmlReadFile(fileName, NULL, 0)) == NULL) {
        xmlFreeDoc(doc);
        xmlCleanupParser();
        return NULL;
    }
    if (doc == NULL) { // check if xmlDoc is valid
        xmlFreeDoc(doc);
        xmlCleanupParser();
        return NULL;
    }

    // allocate memory, set defaults, get root node
    gpx = malloc(sizeof(GPXdoc));
    
    root = xmlDocGetRootElement(doc);
    if (root == NULL) return NULL;

    // create needed lists
    gpx->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    gpx->routes = initializeList(&routeToString, &deleteRoute, &compareRoutes);
    gpx->tracks = initializeList(&trackToString, &deleteTrack, &compareTracks);

    // Loop through all nodes
    if (traverse_xml_file(root, gpx, doc) == FAILURE) {
        if (doc != NULL) xmlFreeDoc(doc);
        xmlCleanupParser();
        if (gpx != NULL) deleteGPXdoc(gpx);
        return NULL; // error so return NULL
    }

    /*free the document */
    if (doc != NULL) xmlFreeDoc(doc);

    /*
     *Free the global variables that may
     *have been allocated by the parser.
     */
    xmlCleanupParser();

    return gpx;
}

/** Function to delete doc content and free all the memory.
 *@pre GPX object exists, is not null, and has not been freed
 *@post GPX object had been freed
 *@return none
 *@param obj - a pointer to an GPX struct
**/
void deleteGPXdoc(GPXdoc* doc) {
    if (doc == NULL) return;
    if (doc->creator != NULL) free(doc->creator);
    if (doc->waypoints != NULL) freeList(doc->waypoints);
    if (doc->routes != NULL) freeList(doc->routes);
    if (doc->tracks != NULL) freeList(doc->tracks);
    free(doc);
    doc = NULL;
}

/** Function to create a string representation of an GPX object.
 *@pre GPX object exists, is not null, and is valid
 *@post GPX has not been modified in any way, and a string representing the GPX contents has been created
 *@return a string contaning a humanly readable representation of an GPX object
 *@param obj - a pointer to an GPX struct
**/
char* GPXdocToString(GPXdoc* doc) {
    if (doc == NULL) {
        return NULL;
    }
    char *output = NULL;
    int size_needed = 1; // one extra for the null terminator
    char* waypoints_str = toString(doc->waypoints);
    char* routes_str = toString(doc->routes);
    char *tracks_str = toString(doc->tracks);

    size_needed += snprintf(NULL, 0, "CREATOR: %s\nNAMESPACE: %s\nVERSION: %f\nWAYPOINTS---------------\n%s\n"
            "---------------WAYPOINTS (end)\nROUTES===============\n%s\n===============ROUTES (end)\n"
            "TRACKS:+++++++++++++++\n%s\n+++++++++++++++TRACKS (end)\n", doc->creator,
            doc->namespace, doc->version, waypoints_str, routes_str, tracks_str);

    // print all data to output string
    output = malloc(size_needed);
    sprintf(output, "CREATOR: %s\nNAMESPACE: %s\nVERSION: %f\nWAYPOINTS---------------\n%s\n"
            "---------------WAYPOINTS (end)\nROUTES===============\n%s\n===============ROUTES (end)\n"
            "TRACKS:+++++++++++++++\n%s\n+++++++++++++++TRACKS (end)\n", doc->creator, doc->namespace,
            doc->version, waypoints_str, routes_str, tracks_str);

    free(waypoints_str);
    free(routes_str);
    free(tracks_str);
    return output;
}

// --------------------------- ACCESSOR AND SUMMARY FUNCTIONS ---------------------------

//Total number of waypoints in the GPX file
int getNumWaypoints(const GPXdoc* doc) {
    if (doc == NULL || doc->waypoints == NULL) return 0;
    return getLength(doc->waypoints);
}

//Total number of routes in the GPX file
int getNumRoutes(const GPXdoc* doc) {
    if (doc == NULL || doc->routes == NULL) return 0;
    return getLength(doc->routes);
}

//Total number of tracks in the GPX file
int getNumTracks(const GPXdoc* doc) {
    if (doc == NULL || doc->tracks == NULL) return 0;
    return getLength(doc->tracks);
}

//Total number of segments in all tracks in the document
int getNumSegments(const GPXdoc* doc) {
    if (doc == NULL || doc->tracks == NULL) return 0;
    int count = 0;
    ListIterator tracksIter = createIterator(doc->tracks);
    Track *curr_trk = nextElement(&tracksIter);
    while (curr_trk != NULL) {
        count += getLength(curr_trk->segments);
        curr_trk = nextElement(&tracksIter);
    }
    return count;
}

//Total number of GPXData elements in the document
int getNumGPXData(const GPXdoc* doc) {
    if (doc == NULL || doc->waypoints == NULL || doc->routes == NULL || doc->tracks == NULL) return 0;
    int count = 0;

    // Get all GPXData in the Waypoints
    ListIterator wptsIter = createIterator(doc->waypoints);
    Waypoint *curr_wpt = nextElement(&wptsIter);
    while (curr_wpt != NULL) {
        count += getLength(curr_wpt->otherData);
        if (strlen(curr_wpt->name) > 0) count++; // add name as GPXData if the string isn't empty
        curr_wpt = nextElement(&wptsIter);
    }

    // Get all GPXData in the Routes 
    ListIterator routesIter = createIterator(doc->routes);
    Route *curr_route = nextElement(&routesIter);
    while (curr_route != NULL) {
        count += getLength(curr_route->otherData);
        if (strlen(curr_route->name) > 0) count++; // add name as GPXData if the string isn't empty

        // get GPXData in the Route Points (waypoints)
        wptsIter = createIterator(curr_route->waypoints);
        curr_wpt = nextElement(&wptsIter);
        while (curr_wpt != NULL) {
            count += getLength(curr_wpt->otherData);
            if (strlen(curr_wpt->name) > 0) count++; // add name as GPXData if the string isn't empty
            curr_wpt = nextElement(&wptsIter);
        } // end of route point (waypoint) loop

        curr_route = nextElement(&routesIter);
    } // end of route loop

    // Get all GPXData in the Tracks
    ListIterator tracksIter = createIterator(doc->tracks);
    Track *curr_trk = nextElement(&tracksIter);
    while (curr_trk != NULL) {
        count += getLength(curr_trk->otherData);
        if (strlen(curr_trk->name) > 0) count++; // add name as GPXData if the string isn't empty

        // Go through all TrackSegments
        ListIterator segIter = createIterator(curr_trk->segments);
        TrackSegment *curr_seg = nextElement(&segIter);
        while (curr_seg != NULL) {
            // Get all GPXData in the Track Points (waypoints)
            wptsIter = createIterator(curr_seg->waypoints);
            curr_wpt = nextElement(&wptsIter);
            while (curr_wpt != NULL) {
                count += getLength(curr_wpt->otherData);
                if (strlen(curr_wpt->name) > 0) count++; // add name as GPXData if the string isn't empty
                curr_wpt = nextElement(&wptsIter);
            } // end of track point (waypoints) loop

            curr_seg = nextElement(&segIter);
        } // end of track segment loop

        curr_trk = nextElement(&tracksIter);
    } // end of track loop

    return count;
}

// Function that returns a waypoint with the given name.  If more than one exists, return the first one.  
// Return NULL if the waypoint does not exist
Waypoint* getWaypoint(const GPXdoc* doc, char* name) {
    if (doc == NULL || name == NULL || doc->waypoints == NULL) return NULL;
    Waypoint *wpt = NULL; 

    // Loop through all waypoints
    ListIterator wptsIter = createIterator(doc->waypoints);
    Waypoint *curr_wpt = nextElement(&wptsIter);
    while (curr_wpt != NULL) {
        if (strcmp(curr_wpt->name, name) == 0) {
            wpt = curr_wpt;
            break;
        }
        curr_wpt = nextElement(&wptsIter);
    }
    // Otherwise waypoint with target name not found
    return wpt;
}

// Function that returns a track with the given name.  If more than one exists, return the first one. 
// Return NULL if the track does not exist 
Track* getTrack(const GPXdoc* doc, char* name) {
    if (doc == NULL || name == NULL || doc->tracks == NULL) return NULL;
    Track *trk = NULL; 

    // Loop through all tracks
    ListIterator trkIter = createIterator(doc->tracks);
    Track *curr_trk = nextElement(&trkIter);
    while (curr_trk != NULL) {
        if (strcmp(curr_trk->name, name) == 0) {
            trk = curr_trk;
            break;
        }
        curr_trk = nextElement(&trkIter);
    }
    // Otherwise track with target name not found
    return trk;
}

// Function that returns a route with the given name.  If more than one exists, return the first one.  
// Return NULL if the route does not exist
Route* getRoute(const GPXdoc* doc, char* name) {
    if (doc == NULL || name == NULL || doc->routes == NULL) return NULL;
    Route *rte = NULL; 

    // Loop through all routes
    ListIterator rteIter = createIterator(doc->routes);
    Route *curr_rte = nextElement(&rteIter);
    while (curr_rte != NULL) {
        if (strcmp(curr_rte->name, name) == 0) {
            rte = curr_rte;
            break;
        }
        curr_rte = nextElement(&rteIter);
    }
    // Otherwise route with target name not found
    return rte;
}

// --------------------------- REQUIRED HELPER FUNCTIONS ----------------------------

// WAYPOINTS
void deleteWaypoint(void* data) {
    if (data == NULL) return; // no need to free anything
    if (((Waypoint*)data)->name != NULL) free(((Waypoint*)data)->name);
    if (((Waypoint*)data)->otherData != NULL) freeList(((Waypoint*)data)->otherData);
    free(data);
    data = NULL;
}

char* waypointToString( void* data) {
    if (data == NULL) return NULL;
    char *output;
    int size_needed = 1; // 1 extra for the null terminator
    char *list_str = toString(((Waypoint*)data)->otherData);
    size_needed += snprintf(NULL, 0, "NAME: %s\nLATITUDE: %f\nLONGITUTE: %f\nOTHER DATA:__________\n%s\n__________OTHER DATA (end)\n",
            ((Waypoint*)data)->name, ((Waypoint*)data)->latitude, ((Waypoint*)data)->longitude, list_str);
    
    output = malloc(size_needed); //allocate memory and create the string
    sprintf(output, "NAME: %s\nLATITUDE: %f\nLONGITUTE: %f\nOTHER DATA:__________\n%s\n__________OTHER DATA (end)\n", ((Waypoint*)data)->name,
            ((Waypoint*)data)->latitude, ((Waypoint*)data)->longitude, list_str);

    free(list_str);
    return output;
}

int compareWaypoints(const void *first, const void *second) {
    return 0; //Don't need to compare for our implementation
}

// GPXDATA / OTHER DATA
void deleteGpxData( void* data) {
    if (data == NULL) return; // no need to free anything
    free(data);
    data = NULL;
}

char* gpxDataToString( void* data) {
    if (data == NULL) return NULL;
    char *output = NULL;
    int size_needed = 1;
    size_needed += snprintf(NULL, 0, "\"%s\": \"%s\"\n", ((GPXData*)data)->name, ((GPXData*)data)->value);
    output = malloc(size_needed);
    sprintf(output, "\"%s\": \"%s\"\n", ((GPXData*)data)->name, ((GPXData*)data)->value);
    return output;
}

int compareGpxData(const void *first, const void *second) {
    return 0; //Don't need to compare for our implementation
}

// ROUTES
void deleteRoute(void* data) {
    if (data == NULL) return;
    if (((Route*)data)->name != NULL) free(((Route*)data)->name);
    if (((Route*)data)->waypoints != NULL) freeList(((Route*)data)->waypoints);
    if (((Route*)data)->otherData != NULL) freeList(((Route*)data)->otherData);
    free(data);
    data = NULL;
}

char* routeToString(void* data) {
    if (data == NULL) return NULL;
    char *output = NULL;
    int size_needed = 1;
    char *rtept_list = toString(((Route*)data)->waypoints);
    char *other_data = toString(((Route*)data)->otherData);
    size_needed += snprintf(NULL, 0, "NAME: %s\nROUTE POINTS:---------------\n%s\n---------------ROUTE POINTS (end)\n"
            "OTHER DATA:__________\n%s\n__________OTHER DATA (end)\n", ((Route*)data)->name, rtept_list, other_data);
    output = malloc(size_needed);
    sprintf(output, "NAME: %s\nROUTE POINTS:---------------\n%s\n---------------ROUTE POINTS (end)\n"
            "OTHER DATA:__________\n%s\n__________OTHER DATA (end)\n", ((Route*)data)->name, rtept_list, other_data);
    free(rtept_list);
    free(other_data);
    return output;
}

int compareRoutes(const void *first, const void *second) {
    return 0; //Don't need to compare for our implementation
}

// TRACKS
void deleteTrack(void* data) {
    if (data == NULL) return;
    if (((Track*)data)->name != NULL) free(((Track*)data)->name);
    if (((Track*)data)->segments != NULL) freeList(((Track*)data)->segments);
    if (((Track*)data)->otherData != NULL) freeList(((Track*)data)->otherData);
    free(data);
    data = NULL;
}

char* trackToString(void* data) {
    if (data == NULL) return NULL;
    char *output = NULL;
    int size_needed = 1;
    char *segments = toString(((Track*)data)->segments);
    char *other_data = toString(((Track*)data)->otherData);
    size_needed += snprintf(NULL, 0, "NAME: %s\nSEGMENTS:.................\n%s\n.................SEGMENTS (end)\n"
            "OTHER DATA:__________\n%s\n__________OTHER DATA (end)\n", ((Track*)data)->name, segments, other_data);
    output = malloc(size_needed);
    sprintf(output, "NAME: %s\nSEGMENTS:.................\n%s\n.................SEGMENTS (end)\n"
            "OTHER DATA:__________\n%s\n__________OTHER DATA (end)\n", ((Track*)data)->name, segments, other_data);
    free(segments);
    free(other_data);
    return output;
}

int compareTracks(const void *first, const void *second) {
    return 0; //Don't need to compare for our implementation
}

void deleteTrackSegment(void* data) {
    if (data == NULL) return;
    if (((TrackSegment*)data)->waypoints != NULL) freeList(((TrackSegment*)data)->waypoints);
    free(data);
    data = NULL;
}

char* trackSegmentToString(void* data) {
    if (data == NULL) return NULL;
    char *output = NULL;
    int size_needed = 1;
    char *waypoints = toString(((TrackSegment*)data)->waypoints);
    size_needed += snprintf(NULL, 0, "TRACK POINTS:---------------\n%s\n---------------TRACK POITNS (end)\n", waypoints);
    output = malloc(size_needed);
    sprintf(output, "TRACK POINTS:---------------\n%s\n---------------TRACK POINTS (end)\n", waypoints);
    free(waypoints);
    return output;
}

int compareTrackSegments(const void *first, const void *second) {
    return 0; //Don't need to compare for our implementation
}

// --------------------------- HELPER FUNCTIONS ----------------------------

/**
 * Recursive function that will traverse all elements of the xml file related to the 
 * given root Node.
 * @root: the initial xml node to consider.
 **/
int traverse_xml_file(xmlNode * root, GPXdoc *gpx, xmlDoc *doc) {
    xmlNode *cur_node = NULL;
    for (cur_node = root; cur_node != NULL; cur_node = cur_node->next) {

        if (cur_node->name == NULL || strlen((char*)cur_node->name) < 1) {
            return FAILURE;
        }

        if (strcmp((char*)cur_node->name, "gpx") == 0) {
            if (parseGPXNode(gpx, cur_node, doc) == FAILURE) {
                return FAILURE;
            }
        } else if (strcmp((char*)cur_node->name, "wpt") == 0) {
            if (parseWptNode(gpx, cur_node, doc, gpx->waypoints) == FAILURE) {
                return FAILURE;
            }
        } else if (strcmp((char*)cur_node->name, "rte") == 0) {
            if (parseRteNode(gpx, cur_node, doc) == FAILURE) {
                return FAILURE;
            }
        } else if (strcmp((char*)cur_node->name, "trk") == 0) {
            if (parseTrkNode(gpx, cur_node, doc) == FAILURE) {
                return FAILURE;
            }
        }

        if (traverse_xml_file(cur_node->children, gpx, doc) == FAILURE) {
            return FAILURE;
        }
    }
    
    return SUCCESS;
}

//Gets necessary information from the given GPXNode
int parseGPXNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc) {
    xmlAttr *attr;

    if (node->ns == NULL || node->ns->href == NULL) {
        return FAILURE;
    }

    if ((char*)node->ns->href != NULL && strlen((char*)node->ns->href) > 0) { // get namespace
            strcpy(gpx->namespace, (char*)node->ns->href);
    } else {
        return FAILURE;
    }

    // Loop through all attributes/properties of the node
    for (attr = node->properties; attr != NULL; attr = attr->next) { // get namespace
        xmlNode *value = attr->children;
        char *attrName = (char *)attr->name;
        char *cont = (char *)(value->content);
        
        if (strcmp(attrName, "version") == 0) { // get version
            if (cont != NULL && strlen(cont) > 0) { // valid string
                double verNum = strtod(cont, NULL);
                if (verNum == 0) { // error
                    return FAILURE;
                } 
                gpx->version = verNum;
            } else {
                return FAILURE;
            }
        } else if (strcmp(attrName, "creator") == 0) { // get creator
            if (cont != NULL && strlen(cont) > 0) { // valid string
                gpx->creator = malloc(strlen(cont) + 1); // allocate memory for the creator
                strcpy(gpx->creator, cont);
            } else {
                return FAILURE;
            }
        }
    }
    if (gpx->creator == NULL) return FAILURE;
    return SUCCESS;
}

// Gets all necessary information from the given Waypoint node
int parseWptNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc, List* toBeAdded) {
    xmlAttr *attr;
    
    // initialize Waypoint
    Waypoint *wpt = malloc(sizeof(Waypoint));
    wpt->latitude = 0;
    wpt->longitude = 0;;
    wpt->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData);
    wpt->name = NULL;

    // Loop through all attributes/properties of the node
    for (attr = node->properties; attr != NULL; attr = attr->next) {
        xmlNode *value = attr->children;
        char *attrName = (char *)attr->name;
        char *cont = (char *)(value->content);

        if (strcmp(attrName, "lat") == 0 || strcmp(attrName, "latitude") == 0) { // get latitude
            if (cont != NULL && strlen(cont) > 0) { // valid string
                double lat = strtod(cont, NULL);
                wpt->latitude = lat;
            } else {
                return FAILURE;
            }
        } else if (strcmp(attrName, "lon") == 0 || strcmp(attrName, "longitude") == 0) { // get longitude
            if (cont != NULL && strlen(cont) > 0) { // valid string
                double lon  = strtod(cont, NULL);
                wpt->longitude = lon;
            } else {
                return FAILURE;
            }
        }
    }
    // look for name and other data
    if (getAllWptData(node->children, wpt) == FAILURE) return FAILURE;
    
    if (wpt->name == NULL) { // ensure name is not NULL
        wpt->name = malloc(2);
        strcpy(wpt->name, "");
    }
    insertBack(toBeAdded, wpt);
    return SUCCESS;
}

// Gets all information from the children of the given Waypoint node child
int getAllWptData(xmlNode* child_node, Waypoint* wpt) {
    xmlNode *cur_node = NULL;

    for (cur_node = child_node; cur_node != NULL; cur_node = cur_node->next) {

        // get any nested data
        if (cur_node->content == NULL) {
            char* temp = (char*)xmlNodeGetContent(cur_node);
            if (strcmp((char*)cur_node->name, "name") == 0) { // set Waypoint name
                wpt->name = malloc(strlen(temp) + 1);
                strcpy(wpt->name, temp);
            } else { // add anything else to Other Data list
                GPXData *other = malloc(sizeof(GPXData) + strlen(temp) + 1);
                strcpy(other->name, (char*)cur_node->name);
                strcpy(other->value, temp);
                insertBack(wpt->otherData, other);
            }
            free(temp);
        }
    }
    return SUCCESS;
}

// Gets all necessary information from the given Route node
int parseRteNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc) {
    // initialize Route
    Route *rte = malloc(sizeof(Route));
    xmlNode *cur_node = NULL;
    rte->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    rte->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData);
    rte->name = NULL;
    
    for (cur_node = node->children; cur_node != NULL; cur_node = cur_node->next) {
        // get any nested data
        if (cur_node->content == NULL) {
            char *temp = (char*)xmlNodeGetContent(cur_node);
            if (strcmp((char*)cur_node->name, "name") == 0) { // set Route name
                rte->name = malloc(strlen(temp) + 1);
                strcpy(rte->name, temp);
            } else if (strcmp((char*)cur_node->name, "rtept") == 0) { // set route point (waypoint)
               if (parseWptNode(gpx, cur_node, doc, rte->waypoints) == FAILURE) {
                    deleteGPXdoc(gpx);
                    xmlFreeDoc(doc);
                    xmlCleanupParser();
                    return FAILURE;
                }
            } else { // add anything else to Other Data list
                GPXData *other = malloc(sizeof(GPXData) + strlen(temp) + 1);
                strcpy(other->name, (char*)cur_node->name);
                strcpy(other->value, temp);
                insertBack(rte->otherData, other);
            }
            free(temp);
        }
    }
    if (rte->name == NULL) {
        rte->name = malloc(2);
        strcpy(rte->name, "");
    }
    insertBack(gpx->routes, rte);
    return SUCCESS;
}

// Gets all necessary information from the given Track node
int parseTrkNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc) {
    // initialize Track
    Track *trk = malloc(sizeof(Track));
    xmlNode *cur_node = NULL;
    trk->segments = initializeList(&trackSegmentToString, &deleteTrackSegment, &compareTrackSegments);
    trk->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData);
    trk->name = NULL;
    
    for (cur_node = node->children; cur_node != NULL; cur_node = cur_node->next) {
        // get any nested data
        if (cur_node->content == NULL) {
            char *temp = (char*)xmlNodeGetContent(cur_node);
            if (strcmp((char*)cur_node->name, "name") == 0) { // set Track name
                trk->name = malloc(strlen(temp) + 1);
                strcpy(trk->name, temp);
            } else if (strcmp((char*)cur_node->name, "trkseg") == 0) { // Get track segment (list of trkpts/waypoints)
               if (parseTrkSegNode(gpx, cur_node, doc, trk->segments) == FAILURE) {
                    deleteGPXdoc(gpx);
                    xmlFreeDoc(doc);
                    xmlCleanupParser();
                    return FAILURE;
                }
            } else { // add anything else to Other Data list
                GPXData *other = malloc(sizeof(GPXData) + strlen(temp) + 1);
                strcpy(other->name, (char*)cur_node->name);
                strcpy(other->value, temp);
                insertBack(trk->otherData, other);
            }
            free(temp);
        }
    }
    if (trk->name == NULL) {
        trk->name = malloc(2);
        strcpy(trk->name, "");
    }
    insertBack(gpx->tracks, trk);
    return SUCCESS; 
}

// Gets all necessary information from the given Track Segment node
int parseTrkSegNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc, List* segmentsList) {
    // initialize TrackSegment
    TrackSegment *seg = malloc(sizeof(Track));
    xmlNode *cur_node = NULL;
    seg->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    
    //loop through all track points and add them to the track segment
    for (cur_node = node->children; cur_node != NULL; cur_node = cur_node->next) {

        if (strcmp((char*)cur_node->name, "trkpt") == 0) { // Get get track point (waypoint)
            if (parseWptNode(gpx, cur_node, doc, seg->waypoints) == FAILURE) {
                deleteGPXdoc(gpx);
                xmlFreeDoc(doc);
                xmlCleanupParser();
                return FAILURE;
            }
        }
    }
    insertBack(segmentsList, seg);
    return SUCCESS; 
}

// --------------------------------------------------- GPXdoc Validation - A2 FUNCTIONS ---------------------------------------------------

/* create an GPX object based on the contents of an GPX file, validating the XML tree generated by libxml against
a GPX schema file before attempting to traverse the tree and create an GPXdoc struct */
GPXdoc* createValidGPXdoc(char *fileName, char* gpxSchemaFile) {
    if (fileName == NULL || gpxSchemaFile == NULL || strlen(fileName) <= 0 || strlen(gpxSchemaFile) <= 0) return NULL;
    
    xmlDocPtr doc;

    if ( (doc = xmlReadFile(fileName, NULL, 0)) == NULL) {
        return NULL; // invalid XML
    }
    if (doc == NULL) {
        return NULL;
    }

    xmlSchemaPtr schema = NULL;
    xmlSchemaParserCtxtPtr ctxt;

    xmlLineNumbersDefault(1);

    ctxt = xmlSchemaNewParserCtxt(gpxSchemaFile);

    xmlSchemaSetParserErrors(ctxt, (xmlSchemaValidityErrorFunc) fprintf, (xmlSchemaValidityWarningFunc) fprintf, stderr);
    schema = xmlSchemaParse(ctxt);
    xmlSchemaFreeParserCtxt(ctxt);

    if (validateXml(doc, schema) == false) {
        return NULL; //invalid gpx format in the xml
    }

    // now that is is validated, creat the GPXdoc
    GPXdoc *new_doc = createGPXdoc(fileName);

    return new_doc;
}

// Function to validating an existing a GPXobject object against a GPX schema file
bool validateGPXDoc(GPXdoc* doc, char* gpxSchemaFile) {
    if (doc == NULL || gpxSchemaFile == NULL || strlen(gpxSchemaFile) <= 0) return false;

    // check if contents represent valid GPX image once converted to XML
    xmlDocPtr temp_xmlDoc = GPXtoXml(doc);
    if (temp_xmlDoc == NULL) {
        return false;
    }
    xmlSchemaPtr schema = NULL;
    xmlSchemaParserCtxtPtr ctxt;

    xmlLineNumbersDefault(1);

    ctxt = xmlSchemaNewParserCtxt(gpxSchemaFile);

    xmlSchemaSetParserErrors(ctxt, (xmlSchemaValidityErrorFunc) fprintf, (xmlSchemaValidityWarningFunc) fprintf, stderr);
    schema = xmlSchemaParse(ctxt);
    xmlSchemaFreeParserCtxt(ctxt);

    if ( validateXml(temp_xmlDoc, schema) == false ) {
        return false; //invalid gpx format in the xml
    }

    // check if the GPXDoc violates any of the constraints specified in GPXParser
    if (doc->creator == NULL || strlen(doc->creator) <= 0) return false;
    else if (doc->namespace == NULL || strlen(doc->namespace) <= 0) return false;
    else if (doc->version < 0) return false;

    // check lists
    if (doc->waypoints == NULL || doc->routes == NULL || doc->tracks == NULL) return false;

    // Waypoints, Routes and Tracks
    if (validateWaypointList(doc->waypoints) == false) return false;
    if (validateRouteList(doc->routes) == false) return false;
    if (validateTrackList(doc->tracks) == false) return false;

    return true; // otherwise, it is valid
}

//Function to writing a GPXdoc into a file in GPX format.
bool writeGPXdoc(GPXdoc* doc, char* fileName) {
    if (doc == NULL || fileName == NULL || strlen(fileName) <= 0) return false;

    xmlDocPtr doc_to_write = GPXtoXml(doc);
    if (doc_to_write == NULL) {
        xmlCleanupParser();
        xmlMemoryDump();
        return false;
    }
 
    //Dumping document to file
    if ( (xmlSaveFormatFileEnc(fileName, doc_to_write, "UTF-8", 1)) == -1) { // returns -1 on error
        if (doc_to_write != NULL) xmlFreeDoc(doc_to_write);
        xmlCleanupParser();
        xmlMemoryDump();
        return false;
    }

    /*free the document */
    if (doc_to_write != NULL) xmlFreeDoc(doc_to_write);
    xmlCleanupParser();
    xmlMemoryDump();

    return true;
}

// MODULE 2

// we already know that the length is a positive number
float round10(float len){
    //int int_len = (int) (len + 0.5); (rounded the decimal first)
    int int_len = (int) len;
    int remainder = int_len % 10;
    if (remainder >= 5) { // round-up
        int_len += 10 - remainder;
    } else { // round-down
        int_len -= remainder;
    }
    return (float) int_len;
}

float getRouteLen(const Route *rt) {
    if (rt == NULL) return 0;

    ListIterator itr = createIterator(rt->waypoints);
    Waypoint *wpt1 = nextElement(&itr);
    float total = 0;
    while ( wpt1 != NULL ) {
        Waypoint *wpt2 = nextElement(&itr);
        if (wpt2 != NULL) {
            total += calcDistance(wpt1, wpt2);
        }
        wpt1 = wpt2;
    }
    return total;
}

float getTrackLen(const Track *tr){
    if (tr == NULL) return 0;

    ListIterator itr = createIterator(tr->segments);
    TrackSegment *trkseg = nextElement(&itr);
    Waypoint *lastWpt = NULL;
    float total = 0;

    while (trkseg != NULL) {
        ListIterator wptItr = createIterator(trkseg->waypoints);
        Waypoint *wpt1 = nextElement(&wptItr);

        if (lastWpt != NULL) { // add distance between segments
            total += calcDistance(lastWpt, wpt1);
            lastWpt = NULL; // set back to default
        }
        while (wpt1 != NULL) {
            Waypoint *wpt2 = nextElement(&wptItr);
            if (wpt2 != NULL) {
                total += calcDistance(wpt1, wpt2);
            } else {
                lastWpt = wpt1; // save last waypoint in the segment
            }
            wpt1 = wpt2;
        }

        trkseg = nextElement(&itr);
    } 

    return total;
}

int numRoutesWithLength(const GPXdoc* doc, float len, float delta){
    if (doc == NULL || len < 0 || delta < 0) return 0;

    int total = 0;

    ListIterator itr = createIterator(doc->routes);
    Route *rte = nextElement(&itr);
    // loop through all routes in GPXdoc
    while (rte != NULL) { 
        float diff = len - getRouteLen(rte);
        if (diff < 0) diff *= -1; // acts as an absolute value function - we want the absolute value/magnitude of the difference
        if ( diff <= delta ) {
            total++; // within the delta of the target len, so it counts
        }
        rte = nextElement(&itr);
    }

    return total;
}

int numTracksWithLength(const GPXdoc* doc, float len, float delta){
    if (doc == NULL || len < 0 || delta < 0) return 0;

    int total = 0;

    ListIterator itr = createIterator(doc->tracks);
    Track *trk = nextElement(&itr);
    // loop through all tracks in GPXdoc
    while (trk != NULL) { 
        float diff = len - getTrackLen(trk);
        if (diff < 0) diff *= -1; // acts as an absolute value function - we want the absolute value/magnitude of the difference
        if ( diff <= delta ) {
            total++; // within the delta of the target len, so it counts
        }
        trk = nextElement(&itr);
    }

    return total;
}

bool isLoopRoute(const Route* route, float delta){
    if (route == NULL || delta < 0) return false;

    if (getLength(route->waypoints) < 4) return false; // must have at least 4 waypoints to be a loop

    Waypoint *first = NULL;
    Waypoint *last = NULL;
    first = getFromFront(route->waypoints);
    last = getFromBack(route->waypoints);

    if (first == NULL || last == NULL) return false;

    float distance = calcDistance(first, last);
    if (distance <= delta) return true; // within delta, so it is a loop
    else return false; // otherwise, it is not a loop
}

bool isLoopTrack(const Track *tr, float delta){
    if (tr == NULL || delta < 0) return false;

    // must have at least 4 waypoints to be a loop
    int num_wpt = 0;
    ListIterator itr = createIterator(tr->segments);
    TrackSegment *trkseg = nextElement(&itr);
    while (trkseg != NULL) {
        num_wpt += getLength(trkseg->waypoints);
        trkseg = nextElement(&itr);
    }
    if (num_wpt < 4) return false;

    Waypoint *first = NULL;
    Waypoint *last = NULL;
    first = getFromFront( ((TrackSegment*)(getFromFront(tr->segments)))->waypoints );
    last = getFromBack( ((TrackSegment*)(getFromBack(tr->segments)))->waypoints );

    if (first == NULL || last == NULL) return false;

    float distance = calcDistance(first, last);
    if (distance <= delta) return true; // within delta, so it is a loop
    else return false; // otherwise, it is not a loop
}

List* getRoutesBetween(const GPXdoc* doc, float sourceLat, float sourceLong, float destLat, float destLong, float delta){
    if (doc == NULL || delta < 0) return NULL;

    List* validRoutes = initializeList(&routeToString, &deleteListDummy, &compareRoutes); // initialize the list

    ListIterator itr = createIterator(doc->routes);
    Route *rte = nextElement(&itr);

    // create temp Waypoint structs so that calcDistance() can be used
    Waypoint sourceWpt;
    sourceWpt.latitude = (double) sourceLat;
    sourceWpt.longitude = (double) sourceLong;
    Waypoint destWpt;
    destWpt.latitude = (double) destLat;
    destWpt.longitude = (double) destLong;

    Waypoint *first = NULL;
    Waypoint *last = NULL;
    while (rte != NULL) {
        
        first = getFromFront(rte->waypoints);
        last = getFromBack(rte->waypoints);
        if (first != NULL && last != NULL) {
            if ( calcDistance(first, &sourceWpt) <= delta && calcDistance(last, &destWpt) <= delta ) {
                insertBack(validRoutes, rte); // this route works, so add it to the output list
            }
        }

        rte = nextElement(&itr);
    }

    if (getLength(validRoutes) <= 0) {
        if (validRoutes != NULL) free(validRoutes);
        validRoutes = NULL;
        return NULL; // no valid routes
    }
    return validRoutes;
}

List* getTracksBetween(const GPXdoc* doc, float sourceLat, float sourceLong, float destLat, float destLong, float delta){
    if (doc == NULL || delta < 0) return NULL;

    List* validTracks = initializeList(&trackToString, &deleteListDummy, &compareTracks); // initialize the list

    ListIterator itr = createIterator(doc->tracks);
    Track *trk = nextElement(&itr);

    // create temp Waypoint structs so that calcDistance() can be used
    Waypoint sourceWpt;
    sourceWpt.latitude = (double) sourceLat;
    sourceWpt.longitude = (double) sourceLong;
    Waypoint destWpt;
    destWpt.latitude = (double) destLat;
    destWpt.longitude = (double) destLong;

    Waypoint *first = NULL;
    Waypoint *last = NULL;
    while (trk != NULL) {
        if (getLength(trk->segments) > 0) {
            first = getFromFront( ((TrackSegment*)getFromFront(trk->segments))->waypoints );
            last = getFromBack( ((TrackSegment*)getFromBack(trk->segments))->waypoints );
            if (first != NULL && last != NULL) {
                if ( calcDistance(first, &sourceWpt) <= delta && calcDistance(last, &destWpt) <= delta ) {
                    insertBack(validTracks, trk); // this route works, so add it to the output list
                }
            }
        }

        trk = nextElement(&itr);
    }

    if (getLength(validTracks) <= 0) {
        if (validTracks != NULL) free(validTracks);
        validTracks = NULL;
        return NULL; // no valid routes
    }
    return validTracks;
}

// MODULE 3 - converting different structs to strings formatted for JSON

// {"name":"routeName","numPoints":numVal,"len":routeLen,"loop":loopStat}
/* routeName is "None" if there is no name, loopStat is "true" or false", and routeLen
is rounded to nearest 10m with 1 decimal place*/
char* routeToJSON(const Route *rt) {
    if (rt == NULL) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "{}");
        return temp;
    }

    char *output = NULL;
    int size_needed = 3; // one extra for the null terminator, and 2 more extra for safety

    // Get all necessary info for the JSON string
    char *routeName = "None";
    if (rt->name != NULL && strlen(rt->name) > 0) { // set name if it exists
        routeName = rt->name;
    }
    int numPoints = getLength(rt->waypoints); // get number of route points
    float routeLen = round10(getRouteLen(rt)); // get route length rounded to nearest 10m
    char loopStat[10]; // get whether it is a loop or not
    if (isLoopRoute(rt, 10.0) == true) { // true //? This was specified to be 10.0 for simplicity, for now
        strcpy(loopStat, "true");
    } else { // false
        strcpy(loopStat, "false");
    }

    size_needed += snprintf(NULL, 0,
            "{\"name\":\"%s\",\"numPoints\":%d,\"len\":%.1f,\"loop\":%s}",
            routeName, numPoints, routeLen, loopStat);

    // print all data to output string
    output = malloc(size_needed);
    sprintf(output,
            "{\"name\":\"%s\",\"numPoints\":%d,\"len\":%.1f,\"loop\":%s}",
            routeName, numPoints, routeLen, loopStat);

    return output;
}

//{"name":"routeName","len":routeLen,"loop":loopStat}
char* trackToJSON(const Track *tr) {
    if (tr == NULL) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "{}");
        return temp;
    }

    char *output = NULL;
    int size_needed = 3; // one extra for the null terminator, and 2 more extra for safety

    // Get all necessary info for the JSON string
    char *routeName = "None";
    if (tr->name != NULL && strlen(tr->name) > 0) { // set name if it exists
        routeName = tr->name;
    }
    int numPoints = 0;
    ListIterator iter = createIterator(tr->segments);
    TrackSegment *trkSeg = nextElement(&iter);
    while (trkSeg != NULL) {
        numPoints += getLength(trkSeg->waypoints);
        trkSeg = nextElement(&iter);
    }
    float routeLen = round10(getTrackLen(tr)); // get route length rounded to nearest 10m
    char loopStat[10]; // get whether it is a loop or not
    if (isLoopTrack(tr, 10.0) == true) { // true //? This was specified to be 10.0 for simplicity, for now
        strcpy(loopStat, "true");
    } else { // false
        strcpy(loopStat, "false");
    }

    size_needed += snprintf(NULL, 0,
            "{\"name\":\"%s\",\"numPoints\":%d,\"len\":%.1f,\"loop\":%s}",
            routeName, numPoints, routeLen, loopStat);

    // print all data to output string
    output = malloc(size_needed);
    sprintf(output, "{\"name\":\"%s\",\"numPoints\":%d,\"len\":%.1f,\"loop\":%s}",
            routeName, numPoints, routeLen, loopStat);

    return output;
}

// [RouteString1,RouteString2,...,RouteStringN] where RouteString(N) is the resultant JSON string of routeToJSON()
char* routeListToJSON(const List *list) {
    if (list == NULL || getLength((List*) list) <= 0) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "[]");
        return temp;
    }

    int size_needed = 5; // start at 5 to account for null terminator and the brackets, and safety
    char* output = NULL;

    ListIterator itr = createIterator((List*) list);
    Route *rte = nextElement(&itr);
    while (rte != NULL) {
        char *temp_JSON_str = routeToJSON(rte);
        size_needed += strlen(temp_JSON_str) + 1; // add 1 to account for the comma between elements
        free(temp_JSON_str); // free temp string
        rte = nextElement(&itr);
    }

    // Now that size is known, print all data to output string
    output = malloc(size_needed);
    strcpy(output, "["); // set the opening bracket

    itr = createIterator((List*) list);
    rte = nextElement(&itr);
    int count = 1;
    int numRoutes = getLength((List*) list);
    while (rte != NULL) {
        char *temp_JSON_str = routeToJSON(rte);
        if (count >= numRoutes) { // last route in list doesn't have a comma after it, but needs closing bracket ']'
            strcat(temp_JSON_str, "]");
            strcat(output, temp_JSON_str);
        } else { // put a comma after the JSON string
            strcat(temp_JSON_str, ",");
            strcat(output, temp_JSON_str);
        }
        free(temp_JSON_str); // free temp string
        count++;
        rte = nextElement(&itr);
    }

    return output;
}

// Same format as routeListToJSON()
char* trackListToJSON(const List *list) {
    if (list == NULL || getLength((List*) list) <= 0) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "[]");
        return temp;
    }

    int size_needed = 5; // start at 5 to account for null terminator and the brackets, and safety
    char* output = NULL;

    ListIterator itr = createIterator((List*) list);
    Track *trk = nextElement(&itr);
    while (trk != NULL) {
        char *temp_JSON_str = trackToJSON(trk);
        size_needed += strlen(temp_JSON_str) + 1; // add 1 to account for the comma between elements
        free(temp_JSON_str); // free temp string
        trk = nextElement(&itr);
    }

    // Now that size is known, print all data to output string
    output = malloc(size_needed);
    strcpy(output, "["); // set the opening bracket

    itr = createIterator((List*) list);
    trk = nextElement(&itr);
    int count = 1;
    int numRoutes = getLength((List*) list);
    while (trk != NULL) {
        char *temp_JSON_str = trackToJSON(trk);
        if (count >= numRoutes) { // last route in list doesn't have a comma after it, but needs closing bracket ']'
            strcat(temp_JSON_str, "]");
            strcat(output, temp_JSON_str);
        } else { // put a comma after the JSON string
            strcat(temp_JSON_str, ",");
            strcat(output, temp_JSON_str);
        }
        free(temp_JSON_str); // free temp string
        count++;
        trk = nextElement(&itr);
    }

    return output;
}

// {"version":ver,"creator":"crVal","numWaypoints":numW,"numRoutes":numR,"numTracks":numT}
char* GPXtoJSON(const GPXdoc* gpx) {
    if (gpx == NULL) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "{}");
        return temp;
    }

    char *output = NULL;
    int size_needed = 3; // one extra for the null terminator, and 2 more extra for safety

    // Get all necessary info for the JSON string
    int numWpt = getLength(gpx->waypoints);
    int numRte = getLength(gpx->routes);
    int numTrk = getLength(gpx->tracks);

    size_needed += snprintf(NULL, 0,
            "{\"version\":%.1lf,\"creator\":\"%s\",\"numWaypoints\":%d,\"numRoutes\":%d,\"numTracks\":%d}",
            gpx->version, gpx->creator, numWpt, numRte, numTrk);

    // print all data to output string
    output = malloc(size_needed);
    sprintf(output,
            "{\"version\":%.1lf,\"creator\":\"%s\",\"numWaypoints\":%d,\"numRoutes\":%d,\"numTracks\":%d}",
            gpx->version, gpx->creator, numWpt, numRte, numTrk);

    return output;
}

// BONUS FUNCTIONS

// adds the given waypoint to the given route at the end of its waypoints list
void addWaypoint(Route *rt, Waypoint *pt) {
    if (rt == NULL || pt == NULL) return;
    insertBack(rt->waypoints, pt);
}

void addRoute(GPXdoc* doc, Route* rt) {
    if (doc == NULL || rt == NULL) return;
    insertBack(doc->routes, rt);
}

// {"version":ver,"creator":"creatorValue"}
GPXdoc* JSONtoGPX(const char* gpxString) {
    if (gpxString == NULL || strlen((char*) gpxString) <= 0) return NULL;
    double version;
    char creator[strlen((char*) gpxString)];
    sscanf(gpxString, "{\"version\":%lf,\"creator\":\"%[^\"]s", &version, creator);

    // Create a new GPX doc
    GPXdoc *gpx = malloc(sizeof(GPXdoc));

    // create needed lists
    gpx->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    gpx->routes = initializeList(&routeToString, &deleteRoute, &compareRoutes);
    gpx->tracks = initializeList(&trackToString, &deleteTrack, &compareTracks);
    gpx->version = version;
    strcpy(gpx->namespace, DEFAULT_NS);
    gpx->creator = malloc(strlen(creator) + 1); // allocate memory for the creator
    strcpy(gpx->creator, creator);

    return gpx;
}

// {"lat":latVal,"lon":lonVal}
Waypoint* JSONtoWaypoint(const char* gpxString) {
    if (gpxString == NULL || strlen((char*) gpxString) <= 0) return NULL;

    double latitude = 0;
    double longitude = 0;

    sscanf(gpxString, "{\"lat\":%lf,\"lon\":%lf}", &latitude, &longitude);

    // Create a new Waypoint
    Waypoint *wpt = malloc(sizeof(Waypoint));

    wpt->name = malloc(sizeof(char) * 5);
    strcpy(wpt->name, ""); // set name as empty string
    wpt->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData); // initialize otherData list
    wpt->latitude = latitude;
    wpt->longitude = longitude;

    return wpt;
}

// {"name":"nameVal"}
Route* JSONtoRoute(const char* gpxString) {
    if (gpxString == NULL || strlen((char*) gpxString) <= 0) return NULL;

    char name[strlen((char*) gpxString)];
    sscanf(gpxString, "{\"name\":\"%[^\"]s", name);

    int i;
    for (i = 0; i < strlen(name); i++) {
        if (name[i] == '"') { // set end of the string at the ending quotation if it exists
            name[i] = '\0';
        }
    }

    // Create a new Route
    Route *rte = malloc(sizeof(Route));
    
    // initialize needed lists
    rte->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    rte->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData);
    // set name
    if (strlen(name) > 0) {
        rte->name = malloc(strlen(name) + 1);
        strcpy(rte->name, name);
    } else {
        rte->name = malloc(sizeof(char) * 5);
        strcpy(rte->name, ""); //set to empty string
    }
    
    return rte;
}

// ------------------------------------- A2 Helper Functions -------------------------------------
xmlDoc* GPXtoXml(GPXdoc* gpx) {
    xmlDocPtr doc = NULL;
    xmlNodePtr root_node = NULL, node = NULL;

    LIBXML_TEST_VERSION;

    // Creates a new document, a node and set it as a root node
    doc = xmlNewDoc(BAD_CAST "1.0");
    root_node = xmlNewNode(NULL, BAD_CAST "gpx");
    xmlDocSetRootElement(doc, root_node);

    char str_version[100];
    sprintf(str_version, "%.1lf", gpx->version);
    xmlNewProp(root_node, BAD_CAST "version", BAD_CAST str_version);
    xmlNewProp(root_node, BAD_CAST "creator", BAD_CAST gpx->creator);
    // set namespace
    xmlNsPtr ns_ptr = xmlNewNs(root_node, BAD_CAST gpx->namespace, NULL);
    xmlSetNs(root_node, ns_ptr);

    //ADD WAYPOINTS
    if (getLength(gpx->waypoints) > 0)
        addWaypointsToXmlNode(root_node, gpx->waypoints, "wpt");

    // ADD ROUTES
    ListIterator rteItr = createIterator(gpx->routes);
    Route *rte = nextElement(&rteItr);
    while (rte != NULL) { // loop through the list of routes
        node = xmlNewChild(root_node, NULL, BAD_CAST "rte", NULL);
        // name (if it exists)
        if (strlen(rte->name) > 0) {
            xmlNewChild(node, NULL, BAD_CAST "name", BAD_CAST rte->name);
        }
        // other data
        ListIterator otherItr = createIterator(rte->otherData);
        GPXData *data = nextElement(&otherItr);
        while (data != NULL) { // loop through the list of other data, and add it
            xmlNewChild(node, NULL, BAD_CAST data->name, BAD_CAST data->value);
            data = nextElement(&otherItr);
        }
        // add route points - "rtept" (list of waypoints)
        if (getLength(rte->waypoints) > 0)
            addWaypointsToXmlNode(node, rte->waypoints, "rtept");

        rte = nextElement(&rteItr);
    }

    // ADD TRACKS
    ListIterator trkItr = createIterator(gpx->tracks);
    Track *trk = nextElement(&trkItr);
    while (trk != NULL) { // loop through the list of Tracks
        node = xmlNewChild(root_node, NULL, BAD_CAST "trk", NULL);
        // name (if it exists)
        if (strlen(trk->name) > 0) {
            xmlNewChild(node, NULL, BAD_CAST "name", BAD_CAST trk->name);
        }
        // other data
        ListIterator otherItr = createIterator(trk->otherData);
        GPXData *data = nextElement(&otherItr);
        while (data != NULL) { // loop through the list of other data, and add it
            xmlNewChild(node, NULL, BAD_CAST data->name, BAD_CAST data->value);
            data = nextElement(&otherItr);
        }
        // add Track segments (lists of track points (waypoints))
        ListIterator trksegItr = createIterator(trk->segments);
        TrackSegment *trkseg = nextElement(&trksegItr);
        while (trkseg != NULL) {
            xmlNodePtr trkseg_node = xmlNewChild(node, NULL, BAD_CAST "trkseg", NULL);
            addWaypointsToXmlNode(trkseg_node, trkseg->waypoints, "trkpt"); // add all track points
            trkseg = nextElement(&trksegItr);
        }
        trk = nextElement(&trkItr);
    }

    return doc;
}

bool validateXml(xmlDoc* doc, xmlSchemaPtr schema) {
    if (doc == NULL || schema == NULL) {
        if (schema != NULL) xmlSchemaFree(schema);
        xmlFreeDoc(doc);
        xmlSchemaCleanupTypes();
        xmlCleanupParser();
        xmlMemoryDump();
        return false; // encountered error
    }
    xmlSchemaValidCtxtPtr valid_ctxt;
    valid_ctxt = xmlSchemaNewValidCtxt(schema);
    xmlSchemaSetValidErrors(valid_ctxt, (xmlSchemaValidityErrorFunc) fprintf, (xmlSchemaValidityWarningFunc) fprintf, stderr);
    if (xmlSchemaValidateDoc(valid_ctxt, doc) != 0) {  // invalid GPX format
        if (valid_ctxt != NULL) xmlSchemaFreeValidCtxt(valid_ctxt);
        if (schema != NULL) xmlSchemaFree(schema);
        xmlFreeDoc(doc);
        xmlSchemaCleanupTypes();
        xmlCleanupParser();
        xmlMemoryDump();
        return false; // encountered error
    }
    
    if (valid_ctxt != NULL) xmlSchemaFreeValidCtxt(valid_ctxt);
    if (schema != NULL) xmlSchemaFree(schema);
    xmlFreeDoc(doc);
    xmlSchemaCleanupTypes();
    xmlCleanupParser();
    xmlMemoryDump();

    return true; // no error occured, so xml is valid
}

// adds all waypoints from the given list to the given root node. type is "wpt" or "rtept" or "trkpt"
void addWaypointsToXmlNode(xmlNodePtr root_node, List *list, char *type) {
    if (root_node == NULL || list == NULL || getLength(list) <= 0) return;
    
    xmlNodePtr node = NULL;
    ListIterator wptItr = createIterator(list);
    Waypoint *wpt = nextElement(&wptItr);
    while (wpt != NULL) { // loop through the list of waypoints
        node = xmlNewChild(root_node, NULL, BAD_CAST type, NULL);
        char temp_str[100];
        sprintf(temp_str, "%lf", wpt->latitude);
        xmlNewProp(node, BAD_CAST "lat", BAD_CAST temp_str);
        sprintf(temp_str, "%lf", wpt->longitude);
        xmlNewProp(node, BAD_CAST "lon", BAD_CAST temp_str);
        // name (if it exists)
        if (strlen(wpt->name) > 0) {
            xmlNewChild(node, NULL, BAD_CAST "name", BAD_CAST wpt->name);
        }
        // other data
        ListIterator otherItr = createIterator(wpt->otherData);
        GPXData *data = nextElement(&otherItr);
        while (data != NULL) { // loop through the list of other data, and add it
            xmlNewChild(node, NULL, BAD_CAST data->name, BAD_CAST data->value);
            data = nextElement(&otherItr);
        }
        wpt = nextElement(&wptItr);
    }
}

bool validateWaypointList(List *list) {
    if (list == NULL) return false;

    ListIterator itr = createIterator(list);
    Waypoint *wpt = nextElement(&itr);
    while (wpt != NULL) {
        // validate latitude and longitude values
        if (wpt->latitude < (-1) * LATITUDE_MINMAX || wpt->latitude > LATITUDE_MINMAX) return false;
        if (wpt->longitude < (-1) * LONGITUDE_MINMAX || wpt->longitude > LONGITUDE_MINMAX) return false;
        if (wpt->name == NULL) return false;
        if (wpt->otherData == NULL) return false;
        // go through otherData list
        if (validateGPXDataList(wpt->otherData) == false) return false;
        wpt = nextElement(&itr);
    }
    return true;
}

bool validateGPXDataList(List *list) {
    if (list == NULL) return false;

    ListIterator otherDataItr = createIterator(list);
    GPXData *data = nextElement(&otherDataItr);
    while (data != NULL) {
        if (data->name == NULL || strlen(data->name) <= 0) return false;
        if (data->value == NULL || strlen(data->value) <= 0) return false;
        data = nextElement(&otherDataItr);
    }
    return true;
}

bool validateRouteList(List *list) {
    if (list == NULL) return false;

    ListIterator itr = createIterator(list);
    Route *rte = nextElement(&itr);
    while (rte != NULL) {
        if (rte->name == NULL) return false;
        // go through Waypoints and OtherData
        if (validateWaypointList(rte->waypoints) == false) return false;
        if (validateGPXDataList(rte->otherData) == false) return false;
        rte = nextElement(&itr);
    }
    return true;
}

bool validateTrackList(List *list) {
    if (list == NULL) return false;

    ListIterator itr = createIterator(list);
    Track *trk = nextElement(&itr);
    while (trk != NULL) {
        if (trk->name == NULL) return false;
        // go through Segments and OtherData
        if (validateSegmentList(trk->segments) == false) return false;
        if (validateGPXDataList(trk->otherData) == false) return false;
        trk = nextElement(&itr);
    }
    return true;
}

bool validateSegmentList(List *list) {
    if (list == NULL) return false;

    ListIterator itr = createIterator(list);
    TrackSegment *trkseg = nextElement(&itr);
    while (trkseg != NULL) {
        // go through Waypoints
        if (validateWaypointList(trkseg->waypoints) == false) return false;
        trkseg = nextElement(&itr);
    }
    return true;
}

float calcDistance(Waypoint *wpt1, Waypoint *wpt2) {
    double p1 = wpt1->latitude * M_PI / 180;
    double p2 = wpt2->latitude * M_PI / 180;
    double deltaPt = (wpt2->latitude - wpt1->latitude) * M_PI / 180;
    double deltaLambda = (wpt2->longitude - wpt1->longitude) * M_PI / 180;
    double d = sin(deltaPt / 2) * sin(deltaPt / 2) + cos(p1) * cos(p2) * sin(deltaLambda / 2) * sin(deltaLambda / 2);
    d = 2 * atan2(sqrt(d), sqrt(1 - d));
    d = R_CONSTANT * d;
    return (float) d; // add to total length/distance
}

void deleteListDummy(void* data) {
    // dummy function that doesn't delete/free the pointers in the list
}

// ----------------------------------- A3 Helper Functions -----------------------------------
char* getGpxSummary(char* filename) {
    char* outputStr;
    GPXdoc* gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL) { // valid
        char* tempStr = GPXtoJSON(gpx);
        outputStr = malloc(strlen(tempStr) + 1);
        strcpy(outputStr, tempStr);
        free(tempStr);
        deleteGPXdoc(gpx);
        return outputStr;
    } else { // invalid
        return NULL;
    }
}

char* getGpxViewData(char* filename) {
    char* outputStr;
    GPXdoc* gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL) { // valid
        char* routesListStr = routeListToJSON(gpx->routes);
        char* tracksListStr = trackListToJSON(gpx->tracks);
        outputStr = malloc(strlen(routesListStr) + strlen(tracksListStr) + 30);
        sprintf(outputStr, "{\"routes\":%s,\"tracks\":%s}", routesListStr, tracksListStr);
        free(routesListStr);
        free(tracksListStr);
        deleteGPXdoc(gpx);
        return outputStr;
    } else { // invalid
        return NULL;
    }
}

char *gpxDataToJSON(GPXData* data) {
    if (data == NULL) {
        char *temp = malloc(5 * sizeof(char));
        strcpy(temp, "{}");
        return temp;
    }

    char *output = NULL;
    int size_needed = 3; // one extra for the null terminator, and 2 more extra for safety

    size_needed += snprintf(NULL, 0, "{\"name\":\"%s\",\"value\":\"%s\"}", data->name, data->value);

    // print all data to output string
    output = malloc(size_needed);
    sprintf(output, "{\"name\":\"%s\",\"value\":\"%s\"}", data->name, data->value);
    // remove any invalid characters
    int i, j = 0;
    char newOutput[strlen(output) + 1];
    for (i = 0; i < strlen(output); i++) { // copy string without any '\n' chars because they are invalid
        if (output[i] != '\n') newOutput[j++] = output[i];
    }
    newOutput[j] = '\0'; // set null terminator
    strcpy(output, newOutput);
    return output;
}

char* getOtherDataJSON(char* filename, char* selection) {
    if (filename == NULL || selection == NULL) {
        return NULL;
    }
    char* outputStr;
    int size_needed = 3;
   
    GPXdoc* gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL) { // valid
        char rteOrTrk[strlen(selection)];
        int id_num;
        sscanf(selection, "%s %d", rteOrTrk, &id_num);
        Route *rte;
        Track *trk;
        ListIterator iter;
        ListIterator otherDataIter;
        int list_length = 0;

        if (strcmp(rteOrTrk, "Route") == 0) { // it is a route
            iter = createIterator(gpx->routes);
            rte = nextElement(&iter);
            int i = 1;
            while (rte != NULL) {
                if (i == id_num) { // this is the route we want
                    // get size needed
                    otherDataIter = createIterator(rte->otherData);
                    GPXData *data = nextElement(&otherDataIter);
                    while (data != NULL) {
                        char *temp_JSON_str = gpxDataToJSON(data);
                        size_needed += strlen(temp_JSON_str + 1);
                        free(temp_JSON_str); // already done using it, so free
                        data = nextElement(&otherDataIter);
                    }
                    otherDataIter = createIterator(rte->otherData);
                    list_length = getLength(rte->otherData);
                    break;
                }

                i++;
                rte = nextElement(&iter);
            }
            if (rte == NULL) return NULL; // shouldn't go through the entire list without finding it
        } else { // Otherwise it is a track
            iter = createIterator(gpx->tracks);
            trk = nextElement(&iter);
            int i = 1;
            while (trk != NULL) {
                if (i == id_num) { // this is the route we want
                    // get size needed
                    otherDataIter = createIterator(trk->otherData);
                    GPXData *data = nextElement(&otherDataIter);
                    while (data != NULL) {
                        char *temp_JSON_str = gpxDataToJSON(data);
                        size_needed += strlen(temp_JSON_str + 1);
                        free(temp_JSON_str); // already done using it, so free
                        data = nextElement(&otherDataIter);
                    }
                    otherDataIter = createIterator(trk->otherData);
                    list_length = getLength(trk->otherData);
                    break;
                }

                i++;
                trk = nextElement(&iter);
            }
            if (trk == NULL) return NULL; // shouldn't go through the entire list without finding it
        }
        outputStr = malloc(size_needed + 3);
        strcpy(outputStr, "[");
        // now get all JSON strings
        GPXData *data = nextElement(&otherDataIter);
        int j = 0;
        while (data != NULL) {
            char *temp_JSON_str = gpxDataToJSON(data);
            strcat(outputStr, temp_JSON_str);
            if (j < list_length - 1) strcat(outputStr, ",");
            else strcat(outputStr, "]");
            free(temp_JSON_str);
            j++;
            data = nextElement(&otherDataIter);
        }
        if (list_length == 0) strcpy(outputStr, "[]"); 
        outputStr[strlen(outputStr)] = '\0'; // set null terminating char
        deleteGPXdoc(gpx);
        return outputStr;
    } else { // invalid
        return NULL;
    }
}

// renames the specified route/track in the specified file to the given name, returning a success/error value
bool renameRteOrTrk(char* filename, char* selection, char* newName) {
    if (filename == NULL || selection == NULL || newName == NULL) return false;
    GPXdoc* gpx = createValidGPXdoc(filename, "parser/gpx.xsd");

    if (gpx != NULL) {
        char rteOrTrk[strlen(selection)];
        int id_num;
        sscanf(selection, "%s %d", rteOrTrk, &id_num);
        Route *rte;
        Track *trk;
        ListIterator iter;
        if (strcmp(rteOrTrk, "Route") == 0) { // it is a route
            iter = createIterator(gpx->routes);
            rte = nextElement(&iter);
            int i = 1;
            while (rte != NULL) {
                if (i == id_num) { // this is the route we want
                    // change its name
                    if (rte->name != NULL) free(rte->name);
                    rte->name = malloc(strlen(newName) + 5);
                    strcpy(rte->name, newName);
                    break;
                }

                i++;
                rte = nextElement(&iter);
            }
            if (rte == NULL) return false; // shouldn't get to the end of the list without finding it
        } else { // Otherwise it is a track
            iter = createIterator(gpx->tracks);
            trk = nextElement(&iter);
            int i = 1;
            while (trk != NULL) {
                if (i == id_num) { // this is the route we want
                    // change its name
                    if (trk->name != NULL) free(trk->name);
                    trk->name = malloc(strlen(newName) + 5);
                    strcpy(trk->name, newName);
                    break;
                }

                i++;
                trk = nextElement(&iter);
            }
            if (trk == NULL) return false; // shouldn't get to the end of the list without finding it
        }
        // write the new GPX doc to the disk
        bool outcome = writeGPXdoc(gpx, filename);
        deleteGPXdoc(gpx);
        return outcome;
    } else {
        return false;
    }
}

// creates a gpx file with the given file name and the given json representation of the gpx file, retuning false if it fails and true if it succeeds
bool createGpxWithFilename(char* filename, char* gpxJSON) {
    if (filename == NULL || strlen(filename) <= 0 || gpxJSON == NULL || strlen(gpxJSON) <= 0) return false;

    GPXdoc *gpx = JSONtoGPX(gpxJSON);
    if (validateGPXDoc(gpx, "parser/gpx.xsd") == false) { // assuming "gpx.xsd" is in this directory
        if (gpx != NULL) deleteGPXdoc(gpx);
        return false;
    } // otherwise Valid gpx doc, so write it
    
    char fullFilepath[strlen(filename) + 20];
    sprintf(fullFilepath, "uploads/%s.gpx", filename);
    if (writeGPXdoc(gpx, fullFilepath) == false) {
        if (gpx != NULL) deleteGPXdoc(gpx);
        return false;
    } // otherwise, it succeeded

    if (gpx != NULL) deleteGPXdoc(gpx);
    return true;
}

// {numWaypoints":2,"latitudes":[-12.928,15.879],"longitudes":[-165.246,119.633]}
Route* JSONtoRouteSpecific(char* JSONstr, char* name) {
    if (JSONstr == NULL || strlen(JSONstr) <= 0) return NULL;
    char latitudesStr[strlen(JSONstr)];
    char longitudesStr[strlen(JSONstr)];
    char tempCopy[strlen(JSONstr) + 1];
    strcpy(tempCopy, JSONstr);
    int numWaypoints = 0;
    char *strToken;
    char lastValidToken[strlen(JSONstr) + 1];
    sscanf(JSONstr, "{\"numWaypoints\":%d,\"latitudes\":[%[^]]", &numWaypoints, latitudesStr);
    strToken = strtok(tempCopy, ":");
    while (strToken != NULL) {
        strcpy(lastValidToken, strToken);
        strToken = strtok(NULL, ":");
    }
    lastValidToken[strlen(lastValidToken)] = '\0';
    sscanf(lastValidToken, "[%[^]]", longitudesStr);
    
    // sscanf(JSONstr, "{\"numWaypoints\":%d,\"latitudes\":[%[^]]s,\"longitudes\":%s",
    //         &numWaypoints, latitudesStr, longitudesStr);
    
    // Create a new Route
    Route *rte = malloc(sizeof(Route));

    // ensure null terminator is set
    latitudesStr[strlen(latitudesStr)] = '\0';
    longitudesStr[strlen(longitudesStr)] = '\0';

    // add name if it exists
    if (name != NULL || strlen(name) > 0) {
        rte->name = malloc(strlen(name) + 1);
        strcpy(rte->name, name);
    } else {
        rte->name = malloc(sizeof(char) * 5);
        strcpy(rte->name, ""); //set to empty string
    }
    // initialize needed lists
    rte->waypoints = initializeList(&waypointToString, &deleteWaypoint, &compareWaypoints);
    rte->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData);
    // add waypoints if they exist
    if (numWaypoints > 0) { 
        char *token = strtok(latitudesStr, ",");
        double lats[numWaypoints];
        int i = 0;
        while (token != NULL) {
            lats[i++] = strtod(token, NULL);
            token = strtok(NULL, ",");
        }
        token = strtok(longitudesStr, ",");
        double lons[numWaypoints];
        i = 0;
        while (token != NULL) {
            lons[i++] = strtod(token, NULL);
            token = strtok(NULL, ",");
        }
        // add all waypoints to the route
        Waypoint *wpt;
        for (i = 0; i < numWaypoints; i++) {
            // create waypoint
            wpt = malloc(sizeof(Waypoint));
            wpt->latitude = lats[i];
            wpt->longitude = lons[i];
            wpt->name = malloc(sizeof(char) * 5);
            strcpy(wpt->name, ""); // empty string for name (default)
            wpt->otherData = initializeList(&gpxDataToString, &deleteGpxData, &compareGpxData); // initialize otherData list

            addWaypoint(rte, wpt); // add to troute
        }
    }
    
    return rte;
}

// adds the given route (from JSON) to the gpx with the given file name, returning true on success, and false on failure
bool addRouteToFile(char* filename, char* JSONstr, char* name) {
    if (filename == NULL || JSONstr == NULL || strlen(filename) <= 0 || strlen(JSONstr) <= 0) return false;
    GPXdoc* gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL) {
        Route *rte = JSONtoRouteSpecific(JSONstr, name);
        if (rte == NULL) {
            deleteGPXdoc(gpx);
            return false;
        }
        addRoute(gpx, rte);
    } else { // invalid
        return false;
    }

    // validate the gpx doc again after adding the route
    if (validateGPXDoc(gpx, "parser/gpx.xsd") == false) { // failed validation
        return false;
    }
    // overwrite file on disk so that it includes the new route
    bool outcome = writeGPXdoc(gpx, filename);
    deleteGPXdoc(gpx);

    return outcome;
}

// finds the paths in the given file and returns a JSON list containing their necessary information, returning NULL on failure
char* findPathsInFile(char* filename, char* pointsJSON) {
    if (filename == NULL || pointsJSON == NULL || strlen(pointsJSON) <= 0) return NULL;

    // get the latitudes and longitudes
    float sourceLat = 0, sourceLon = 0, destLat = 0, destLon = 0, delta = 0;
    char *outputStr;
    sscanf(pointsJSON, "{\"startingLat\":%f,\"startingLon\":%f,\"endingLat\":%f,\"endingLon\":%f,\"delta\":%f}",
            &sourceLat, &sourceLon, &destLat, &destLon, &delta);
    
    GPXdoc *gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL) {
        List* validTracks = getTracksBetween(gpx, sourceLat, sourceLon, destLat, destLon, delta); //default 10 for delta
        List* validRoutes = getRoutesBetween(gpx, sourceLat, sourceLon, destLat, destLon, delta);
        
        // add valid paths to the list
        char* routesListStr = routeListToJSON(validRoutes);
        char* tracksListStr = trackListToJSON(validTracks);
        outputStr = malloc(strlen(routesListStr) + strlen(tracksListStr) + 30);
        sprintf(outputStr, "{\"routes\":%s,\"tracks\":%s}", routesListStr, tracksListStr);
        free(routesListStr);
        free(tracksListStr);
        freeList(validTracks);
        freeList(validRoutes);
    } else return NULL; // invalid gpx file

    deleteGPXdoc(gpx);
    return outputStr;
}

// BONUS FUNCTIONS

char* getNumRtesAndTrksWithLength(char* filename, char* lenStr) {
    if (filename == NULL || lenStr == NULL || strlen(lenStr) <= 0) return NULL;
    int size_needed = 5;
    char* outputStr = NULL;

    int numRoutes = 0;
    int numTracks = 0;
    GPXdoc *gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    float len = atof(lenStr);
    if (gpx != NULL) {
        numRoutes = numRoutesWithLength(gpx, len, 10.0); // 10.0 is the default delta
        numTracks = numTracksWithLength(gpx, len, 10.0);
        size_needed += snprintf(NULL, 0, "{\"routes\":%d,\"tracks\":%d}", numRoutes, numTracks);
        outputStr = malloc(sizeof(char) * size_needed);
        sprintf(outputStr, "{\"routes\":%d,\"tracks\":%d}", numRoutes, numTracks);
    } else {
        return NULL; // error
    }

    deleteGPXdoc(gpx);
    return outputStr;
}

// A4 HELPER FUNCTIONS

char* getPointData(char* filename, char* routeNumStr) {
    if (filename == NULL || routeNumStr == NULL || strlen(routeNumStr) <= 0) return NULL;
    int size_needed = 5;
    char* outputStr = NULL;
    int point_index = 0;

    int routeNum = atoi(routeNumStr);
    GPXdoc *gpx = createValidGPXdoc(filename, "parser/gpx.xsd");
    if (gpx != NULL && gpx->routes != NULL) {
        int i = 0;
        ListIterator iter = createIterator(gpx->routes);
        Route *rte = nextElement(&iter);
        while (rte != NULL) {
            if (i == routeNum) { // arrived at the route in question
                break;
            }
            rte = nextElement(&iter);
            i++;
        }
        if (rte == NULL) return NULL; //couldn't find route

        // get needed size for output string
        iter = createIterator(rte->waypoints);
        Waypoint *wpt = nextElement(&iter);
        point_index = 0;
        while (wpt != NULL) {
            char name[strlen(wpt->name) + 5];
            if (strlen(wpt->name) <= 0) { // no name exists
                strcpy(name, "null");
            } else { // name exists
                sprintf(name, "\"%s\"", wpt->name);
            }
            size_needed += snprintf(NULL, 0, "{\"point_index\":%d,\"latitude\":%lf,\"longitude\":%lf,\"point_name\":%s},",
                    point_index, wpt->latitude, wpt->longitude, name);

            wpt = nextElement(&iter);
            point_index++;
        }

        // fill output string
        outputStr = malloc(sizeof(char) * size_needed);
        // set opening bracket (will be a JSON array)
        strcpy(outputStr, "[");
        iter = createIterator(rte->waypoints);
        wpt = nextElement(&iter);
        point_index = 0;
        while (wpt != NULL) {
            char name[strlen(wpt->name) + 5];
            if (strlen(wpt->name) <= 0) { // no name exists
                strcpy(name, "null");
            } else { // name exists
                sprintf(name, "\"%s\"", wpt->name);
            }
            char buffer[size_needed];
            sprintf(buffer, "{\"point_index\":%d,\"latitude\":%lf,\"longitude\":%lf,\"point_name\":%s}",
                    point_index, wpt->latitude, wpt->longitude, name);
            strcat(outputStr, buffer);
            wpt = nextElement(&iter);
            point_index++;
            if (wpt != NULL) { // add comma between list/array items unless it is the last point
                strcat(outputStr, ",");
            }
        }
        // set closing bracket for JSON array
        strcat(outputStr, "]");
        if (outputStr[strlen(outputStr)] != '\0') outputStr[strlen(outputStr)] = '\0'; // ensure null terminator is set
    } else {
        return NULL; // error
    }

    deleteGPXdoc(gpx);
    return outputStr;
}