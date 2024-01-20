/**
 * Austin Van Braeckel - avanbrae@uoguelph.ca - 1085829
 * 2020-02-04
 * CIS*2750 Assignment 1
 * Header file containing necessary function declarations and macros for the GPXParser.c helper functions.
 */

#ifndef GPX_PARSER_HELPERS_H
#define GPX_PARSER_HELPERS_H

#include "GPXParser.h"

#define SUCCESS 1
#define FAILURE 0

#define LONGITUDE_MINMAX 180
#define LATITUDE_MINMAX 90

#define R_CONSTANT 6371e3

#define DEFAULT_NS "http://www.topografix.com/GPX/1/1"

int traverse_xml_file(xmlNode * root, GPXdoc *gpx, xmlDoc *doc);
int parseGPXNode(GPXdoc* gpx, xmlNode* cur_node, xmlDoc* doc);
int parseWptNode(GPXdoc* gpx, xmlNode* cur_node, xmlDoc* doc, List* toBeAdded);
int getAllWptData(xmlNode* child_node, Waypoint* wpt);
int parseRteNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc);
int parseTrkNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc);
int parseTrkSegNode(GPXdoc* gpx, xmlNode* node, xmlDoc* doc, List* segmentsList);

// A2
bool validateXml(xmlDoc* doc, xmlSchemaPtr schema);
xmlDoc* GPXtoXml(GPXdoc* gpx);
void addWaypointsToXmlNode(xmlNodePtr root_node, List* list, char *type);
bool validateWaypointList(List *list);
bool validateGPXDataList(List *list);
bool validateRouteList(List *list);
bool validateTrackList(List *list);
bool validateSegmentList(List *list);
float calcDistance(Waypoint *wpt1, Waypoint *wpt2);
void deleteListDummy(void* data);

//A3
char* getGpxSummary(char* filename);
char* getGpxViewData(char* filename);
char* gpxDataToJSON(GPXData* data);
char* getOtherDataJSON(char* filename, char* selection);
bool renameRteOrTrk(char* filename, char* selection, char* newName);
bool createGpxWithFilename(char* filename, char* gpxJSON);
Route *JSONtoRouteSpecific(char* JSONstr, char* name);
bool addRouteToFile(char* filename, char* JSONstr, char* name);
char* findPathsInFile(char* filename, char* pointsJSON);
// A3 BONUS
char* getNumRtesAndTrksWithLength(char* filename, char* JSONstr);

#endif