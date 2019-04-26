var defaultMedallions = {
    ForestMedallion: 0,
    FireMedallion: 0,
    WaterMedallion: 0,
    ShadowMedallion: 0,
    SpiritMedallion: 0,
    LightMedallion: 0,
    KokiriEmerald: 0,
    GoronRuby: 0,
    ZoraSapphire: 0,
};
var medallions = defaultMedallions;
var dungeonImg = [
    'Unknown',
    'Slingshot0',
    'Bombs0',
    'Boomerang',
    'Bow0',
    'Hammer',
    'Hookshot0',
    'HoverBoots',
    'MirrorShield'
];
ganonlogic = 'Medallions';
showprizes = true;

var TOTAL_CHECKS = 254;

var itemGrid = [];
var itemLayout = [];

var editmode = false;
var selected = {};

var dungeonSelect = 0;

var startTime;

/** Ordered list of CheckData that will build out a route. */
var route = [];

/** Ordered list of RouteEdge representing time between two regions. */
var routeEdges = [];

/** Map of location name to time spent there (millis). */
var locationDurationsTotal = {};

/** Ordered list of RouteEdge representing time in a visit to a region. */
var locationVisitDurations = [];

/** Ordered list of checks that were skipped. */
var skippedChecks = [];

/** {string} -> [{CheckData}...] Map of item name to all of the locations where that item was found. */
var itemLocationMap = {};

/** Enum of what type of check a checkData is. */
var CheckType = {
    DUNGEON : 'dungeon',
    CHEST : 'chest'
}

/* Enum of what mouse button was used to click */
var ClickType = {
    LEFT : 0,
    MIDDLE : 1,
    RIGHT: 2
}

/**
 * Class representing the travel time between two locations.
 */
function RouteEdge(fromCheckData, toCheckData) {
    this.fromLocation = fromCheckData.location;
    this.toLocation = toCheckData.location;
    this.fromCheckData = fromCheckData;
    this.toCheckData = toCheckData;
}

RouteEdge.prototype.getDuration = function() {
    return this.toCheckData.timestamp - this.fromCheckData.timestamp;
}

/**
 * Class used to fully define the event of opening a check.
 */
function CheckData(checkType, dungeonIndex, chestIndex, inLogic, location) {
    this.checkType = checkType;
    this.dungeonIndex = dungeonIndex;
    this.chestIndex = chestIndex;
    this.inLogic = inLogic;
    this.location = location;
    this.timestamp = new Date();
}

CheckData.prototype.getCheckName = function() {
    switch(this.checkType) {
      case CheckType.NONE:
          return undefined;

      case CheckType.DUNGEON:
          return dungeons[this.dungeonIndex].name + " - " + this.chestIndex;

      case CheckType.CHEST:
          return chests[this.chestIndex].name;

      default:
        return undefined;
    }
};

function setCookie(obj) {
    var d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    var val = JSON.stringify(obj);
    document.cookie = "key=" + val + ";" + expires + ";path=/";
}

function getCookie() {
    var name = "key=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return JSON.parse(c.substring(name.length, c.length));
        }
    }
    return {};
}

var cookieDefault = {
    map: 1,
    iZoom: 100,
    mZoom: 66,
    mPos: 0,
    glogic: 'Medallions',
    prize: 1,
    medallions: defaultMedallions,
    items: defaultItemGrid,
    obtainedItems: items,
    chests: serializeChests(),
    dungeonChests: serializeDungeonChests(),
}

var cookielock = false;
function loadCookie() {
    if (cookielock) {
        return;
    }

    cookielock = true;

    cookieobj = getCookie();

    Object.keys(cookieDefault).forEach(function(key) {
        if (cookieobj[key] === undefined) {
            cookieobj[key] = cookieDefault[key];
        }
    });

    medallions = JSON.parse(JSON.stringify(cookieobj.medallions));
    initGridRow(JSON.parse(JSON.stringify(cookieobj.items)));
    items = JSON.parse(JSON.stringify(cookieobj.obtainedItems));
    deserializeChests(JSON.parse(JSON.stringify(cookieobj.chests)));
    deserializeDungeonChests(JSON.parse(JSON.stringify(cookieobj.dungeonChests)));

    updateGridItemAll();

    document.getElementsByName('showmap')[0].checked = !!cookieobj.map;
    document.getElementsByName('showmap')[0].onchange();
    document.getElementsByName('itemdivsize')[0].value = cookieobj.iZoom;
    document.getElementsByName('itemdivsize')[0].onchange();
    document.getElementsByName('mapdivsize')[0].value = cookieobj.mZoom;
    document.getElementsByName('mapdivsize')[0].onchange();

    document.getElementsByName('mapposition')[cookieobj.mPos].click();

    document.getElementsByName('showprizes')[0].checked = !!cookieobj.prize;
    document.getElementsByName('showprizes')[0].onchange();

    for (rbuttonID in document.getElementsByName('ganonlogic')) {
        rbutton = document.getElementsByName('ganonlogic')[rbuttonID];
        if (rbutton.value == cookieobj.glogic) {
            rbutton.click();
        }
    }

    cookielock = false;
}

function saveCookie() {
    if (cookielock) {
        return;
    }

    cookielock = true;

    cookieobj = {};

    cookieobj.map = document.getElementsByName('showmap')[0].checked ? 1 : 0;
    cookieobj.iZoom = document.getElementsByName('itemdivsize')[0].value;
    cookieobj.mZoom = document.getElementsByName('mapdivsize')[0].value;

    cookieobj.mPos = document.getElementsByName('mapposition')[1].checked ? 1 : 0;

    cookieobj.prize = document.getElementsByName('showprizes')[0].checked ? 1 : 0;

    for (rbuttonID in document.getElementsByName('ganonlogic')) {
        rbutton = document.getElementsByName('ganonlogic')[rbuttonID];
        if (rbutton.checked) {
            cookieobj.glogic = rbutton.value;
        }
    }

    cookieobj.medallions = JSON.parse(JSON.stringify(medallions));
    cookieobj.items = JSON.parse(JSON.stringify(itemLayout));
    cookieobj.obtainedItems = JSON.parse(JSON.stringify(items));
    cookieobj.chests = JSON.parse(JSON.stringify(serializeChests()));
    cookieobj.dungeonChests = JSON.parse(JSON.stringify(serializeDungeonChests()));

    setCookie(cookieobj);

    cookielock = false;
}

function serializeChests() {
    return chests.map(chest => chest.isOpened || false);
}

function serializeDungeonChests() {
    return dungeons.map(dungeon => Object.values(dungeon.chestlist).map(chest => chest.isOpened || false));
}

function deserializeChests(serializedChests) {
    for (var i = 0; i < chests.length; i++) {
        chests[i].isOpened = serializedChests[i];
        refreshChest(i);
    }
}

function deserializeDungeonChests(serializedDungeons) {
    for (var i = 0; i < dungeons.length; i++) {
        var dungeon = dungeons[i];
        var serializedDungeon = serializedDungeons[i];
        var chestNames = Object.keys(dungeon.chestlist);
        for (var j = 0; j < chestNames.length; j++) {
            dungeon.chestlist[chestNames[j]].isOpened = serializedDungeon[j];
        }
    }
}

function updateTime() {
    if (startTime == undefined) {
        return;
    }
    var currentTime = new Date();
    var timerDOM = document.getElementById('timer');
    var timeMillis = currentTime - startTime
    var timeHours = Math.floor(timeMillis / 1000 / 60 / 60);
    var timeMinutes = Math.floor(timeMillis / 1000 / 60 - timeHours * 60);
    var timeSeconds = Math.floor(timeMillis / 1000 - (timeMinutes * 60) - (timeHours * 60 * 60))

    if (timeMinutes < 10) {
        timeMinutes = "0" + timeMinutes
    }

    if (timeSeconds < 10) {
        timeSeconds = "0" + timeSeconds
    }

    timerDOM.innerHTML = timeHours + ":" + timeMinutes + ":" + timeSeconds;
}

setInterval(updateTime, 1000);

/**
 * Event of clicking a chest on the map
 *
 * @param {number} chestIndex Index of the chest in the global chests list
 * @param {boolean} wasSkipped Whether the check was opened or skipped
 */
function toggleChest(chestIndex, wasSkipped) {
    chests[chestIndex].isOpened = !chests[chestIndex].isOpened;
    var inLogic = chests[chestIndex].isAvailable();

    checkData = new CheckData(CheckType.CHEST, null, chestIndex, chests[chestIndex].isAvailable() == 'available', chests[chestIndex].region);

    // Update last opened check
    if (chests[chestIndex].isOpened) {
        addToRoute(checkData, wasSkipped);

    } else {
        removeFromRoute(checkData, wasSkipped);
    }

    refreshChest(chestIndex);
    saveCookie();
}

function refreshChest(x) {
    var stateClass = chests[x].isOpened ? 'opened' : chests[x].isAvailable();
    document.getElementById(x).className = 'mapspan chest ' + stateClass;
}

// Highlights a chest location
function highlight(x) {
    document.getElementById(x).style.backgroundImage = 'url(images/highlighted.png)';
}

function unhighlight(x) {
    document.getElementById(x).style.backgroundImage = 'url(images/poi.png)';
}

// Highlights a chest location (but for dungeons)
function highlightDungeon(x) {
    document.getElementById('dungeon' + x).style.backgroundImage = 'url(images/highlighted.png)';
}

function unhighlightDungeon(x) {
    if (dungeonSelect != x)
        document.getElementById('dungeon' + x).style.backgroundImage = 'url(images/poi.png)';
}

// TODO: pull out common code from here and initial init into helper function
function clickDungeon(d) {
    document.getElementById('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/poi.png)';
    dungeonSelect = d;
    document.getElementById('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/highlighted.png)';

    // Update the DOM object that shows the dungeon name in the submaparea
    var dungeonNameDOM = document.getElementById('submaparea');
    dungeonNameDOM.innerHTML = dungeons[dungeonSelect].name;
    dungeonNameDOM.onclick = new Function('toggleDungeon(this, false,' + dungeonSelect + ')');
    dungeonNameDOM.onauxclick = new Function('toggleDungeon(this, true,' + dungeonSelect + ')');
    dungeonNameDOM.onmouseover = new Function('highlightListItem(this)');
    dungeonNameDOM.onmouseout = new Function('unhighlightListItem(this)');
    dungeonNameDOM.style.cursor = 'pointer';
    dungeonNameDOM.className = 'DC' + dungeons[dungeonSelect].isBeatable();

    var DClist = document.getElementById('submaplist');
    DClist.innerHTML = '';

    for (var key in dungeons[dungeonSelect].chestlist) {
        var dungeonCheckDOM = document.createElement('li');
        dungeonCheckDOM.innerHTML = key;

        if (dungeons[dungeonSelect].chestlist[key].isOpened) {
            dungeonCheckDOM.className = "DCopened";
        } else if ( dungeons[dungeonSelect].chestlist[key].isAvailable()) {
            dungeonCheckDOM.className = "DCavailable";
        } else {
            dungeonCheckDOM.className = "DCunavailable";
        }

        // NOTE: this uses the innerHTML as the chest name. This is a hack because the reference to "key" was not working
        dungeonCheckDOM.onclick = new Function('toggleDungeonChest(this, false, dungeonSelect, this.innerHTML)');
        dungeonCheckDOM.onauxclick = new Function('toggleDungeonChest(this, true, dungeonSelect, this.innerHTML)');

        dungeonCheckDOM.onmouseover = new Function('highlightListItem(this)');
        dungeonCheckDOM.onmouseout = new Function('unhighlightListItem(this)');
        dungeonCheckDOM.style.cursor = "pointer";

        DClist.appendChild(dungeonCheckDOM);
    }
}

function toggleDungeonChest(sender, wasSkipped, dungeonIndex, chestIndex) {
    dungeons[dungeonIndex].chestlist[chestIndex].isOpened = !dungeons[dungeonIndex].chestlist[chestIndex].isOpened;
    var inLogic = dungeons[dungeonIndex].chestlist[chestIndex].isAvailable();

    // Create a check data from this check
    var checkData = new CheckData(CheckType.DUNGEON, dungeonIndex, chestIndex, inLogic, dungeons[dungeonIndex].name)

    if (dungeons[dungeonIndex].chestlist[chestIndex].isOpened) {
        sender.className = 'DCopened';

        // Update last opened check and add to route
        addToRoute(checkData, wasSkipped);

    } else if (dungeons[dungeonIndex].chestlist[chestIndex].isAvailable()) {
        sender.className = 'DCavailable';
        removeFromRoute(checkData, wasSkipped);
    } else {
        sender.className = 'DCunavailable';
        removeFromRoute(checkData, wasSkipped);
    }

    updateMap();
    saveCookie();
}

/**
 * Opens or closes all chests in a dungeon.
 * Note: This does not necessarily toggle individual chests!
 *
 * @param {DOM object} sender The DOM object that was invoked. Here it will be the submaparea object (dungeon title)
 * @param {boolean} wasSkipped Whether the check was opened or skipped
 * @param {number} dungeonIndex The index of the dungeon currently displayed in the submaparea
 */
function toggleDungeon(sender, wasSkipped, dungeonIndex) {
    var DClist = document.getElementById('submaplist');
    var chestlistNames = Object.keys(dungeons[dungeonIndex].chestlist);

    // If the dungeon is already cleared
    if (sender.className == 'DCopened') {
        // Close all chests and set their class to the appropriate value based on their availability
        for (var chestIndex = 0; chestIndex < chestlistNames.length; chestIndex++) {
            var currentChestName = chestlistNames[chestIndex];

            if (dungeons[dungeonIndex].chestlist[currentChestName].isOpened == true) {
              var checkData = new CheckData(CheckType.DUNGEON, dungeonIndex, currentChestName, dungeons[dungeonIndex].chestlist[currentChestName].isAvailable, dungeons[dungeonIndex].name)

              dungeons[dungeonIndex].chestlist[currentChestName].isOpened = false;
              sender.className = dungeons[dungeonIndex].chestlist[currentChestName].isAvailable()
                      ? 'DCavailable'
                      : 'DCunavailable';
                      removeFromRoute(checkData, wasSkipped);
            }
        }
    // If the dungeon is not cleared (regardless of availability logic)
    } else if (sender.className == 'DCavailable'
            || sender.className == 'DCunavailable'
            || sender.className == 'DCpossible') {
        // Open all of the chests
        for (var chestIndex = 0; chestIndex < chestlistNames.length; chestIndex++) {
            var currentChestName = chestlistNames[chestIndex];

            if (dungeons[dungeonIndex].chestlist[currentChestName].isOpened == false) {
                var checkData = new CheckData(CheckType.DUNGEON, dungeonIndex, currentChestName, dungeons[dungeonIndex].chestlist[currentChestName].isAvailable, dungeons[dungeonIndex].name)
                dungeons[dungeonIndex].chestlist[currentChestName].isOpened = true;
                sender.className = 'DCopened';
                addToRoute(checkData, wasSkipped);
          }
        }
    } else {
        throw "Dungeon title DOM object was not of an expected class";
    }

    // Update the dungeon title class
    sender.className = 'DC' + dungeons[dungeonIndex].isBeatable();

    updateMap();
    saveCookie();
}

function highlightListItem(x) {
    x.style.backgroundColor = '#282828';
}

function unhighlightListItem(x) {
    x.style.backgroundColor = '';
}

function setOrder(H) {
    if (H) {
        document.getElementById('layoutdiv').classList.remove('flexcontainer');
    } else {
        document.getElementById('layoutdiv').classList.add('flexcontainer');
    }
    saveCookie();
}

function showPrizes(sender) {
    showprizes = sender.checked;
    updateGridItemAll();
    saveCookie();
}

function setGanonLogic(sender) {
    ganonlogic = sender.value;
    updateMap();
    saveCookie();
}

/**
 * Updates the route to track that a check was opened or
 * updates the skipped checks object if it was skipped (usually due to hint, CSMC, etc)
 * Skipped items will not be counted towards time in a region in the route summary
 *
 * Also starts timer if first check in run
 *
 * @param {CheckData} checkData the check that was routed
 * @param {boolean} wasSkipped whether the check was skipped or opened
 */
function addToRoute(checkData, wasSkipped) {
    if (!wasSkipped) {
        // Update the route
        route.push(checkData);

        // Start the timer if this was the first check
        if (route.length == 1) {
            startTime = new Date();
        }

        // If we travelled between locations for this check, update route edges
        var previousCheck = route[route.length - 2];
        if (previousCheck != undefined && checkData.location != previousCheck.location) {
            var routeEdge = new RouteEdge(previousCheck, checkData);
            routeEdges.push(routeEdge);

            handleLeavingLocation(previousCheck);
        }

        // Update the check progress
        var checkCountDOM = document.getElementById("checkCount");
        checkCountDOM.innerHTML = route.length + "/" + TOTAL_CHECKS;
    } else {
        skippedChecks.push(checkData);
    }
}

/**
 * Handles when a location is left, including updating the time spent there
 *
 * @param {CheckData} lastLocationCheck the last check opened in the location
 */
function handleLeavingLocation(lastLocationCheck) {
    if (locationDurationsTotal[lastLocationCheck.location] == undefined) {
        locationDurationsTotal[lastLocationCheck.location] = 0;
    }

    var timeInPreviousLocation = lastLocationCheck.timestamp - startTime;
    var firstCheck = route[0];
    for (var i = route.length - 2; i >= 0; i--) {
        if(route[i] != undefined && route[i].location != lastLocationCheck.location) {
            timeInPreviousLocation = lastLocationCheck.timestamp - route[i+1].timestamp;
            firstCheck = route[i+1];
            break;
        }
    }
    locationDurationsTotal[lastLocationCheck.location] += timeInPreviousLocation;
    locationVisitDurations.push(new RouteEdge(firstCheck, lastLocationCheck));
}
/**
 * Removes a check from the route and from the skipped checks.
 *
 * @param {CheckData} checkData check to remove from the route
 * @param {boolean} wasSkipped whether the check was skipped or opened
 */
function removeFromRoute(checkData, wasSkipped) {
    for (var i = 0; i < route.length; i++) {
        if (route[i].getCheckName() == checkData.getCheckName()) {
            route.splice(i, 1);
        }
    }

    var checkCountDOM = document.getElementById("checkCount");
    checkCountDOM.innerHTML = route.length + "/" + TOTAL_CHECKS;

    for (var i = 0; i < skippedChecks.length; i++) {
        if (skippedChecks[i].getCheckName() == checkData.getCheckName()) {
            skippedChecks.splice(i, 1);
        }
    }
}

/**
 * Updates the itemLocationMap global variable that tracks where items were found
 * itemLocationMap is a map of item name to a list of checkData objects
 *
 * @param {string} item the name of the item that was picked up
 */
function handleItemPickup(item) {
    var lastCheckOpened = route[route.length - 1];

    // If no checks have been opened, do not update the location map
    if (lastCheckOpened == undefined) {
        return;
    }

    // Make a deep copy of lastCheckOpened
    var checkData = Object.assign(new CheckData(), lastCheckOpened);

    if (itemLocationMap[item] == undefined) {
      itemLocationMap[item] = [];
    }

    itemLocationMap[item].push(checkData);
}

/**
 * Clears the itemLocationMap global variable for an item
 * itemLocationMap is a map of item name to a list of checkData objects
 *
 * @param {string} item the name of the item that was picked up
 */
function handleItemDrop(item) {
    itemLocationMap[item] = undefined;
}

function setZoom(target, sender) {
    document.getElementById(target).style.zoom = sender.value / 100;
    document.getElementById(target).style.zoom = sender.value / 100;

    document.getElementById(target).style.MozTransform = 'scale(' + (sender.value / 100) + ')';
    document.getElementById(target).style.MozTransformOrigin = '0 0';

    document.getElementById(target + 'size').innerHTML = (sender.value) + '%';
    saveCookie();
}

/**
 * Sets which dungeon corresponds to a medallion.
 * NOTE: this assumes it is being invoked from a dungeon selector
 *
 * @param {number} row the row of the medallion in the item grid
 * @param {number} index the idex of the medallion within the item grid row
 * @param {number} dungeonIndex the dungeon corresponding to the medallion
 */
function setMedallionDungeon(row, index, dungeonIndex) {
    medallions[itemLayout[row][index]] = dungeonIndex;
    itemGrid[row][index]["dungeonSelector"].style.visibility = 'hidden';
    updateGridItem(row, index);

}

function toggleRouteAnalytics() {
    if (document.getElementById("layoutdiv").style.visibility == 'visible') {
        Object.values(document.getElementById("routeGraphDiv").children).forEach(child => child.remove());
        Object.values(document.getElementById("barGraphDiv").children).forEach(child => child.remove());
        buildRouteGraph();
    } else {
        document.getElementById("layoutdiv").style.visibility = 'visible';
        document.getElementById("parentGraphDiv").style.visibility = 'hidden';
    }
}

function buildRouteGraph() {
    document.getElementById("parentGraphDiv").style.visibility = 'visible';
    document.getElementById("layoutdiv").style.visibility = 'hidden';

    // Populate the location durations with 0s
    var locations = {};
    route.forEach(check => locations[check.location] = 0);

    var data = [];
    var data2 = [];
    var totalDur = 0

    // Populate data with checkIndex as x and all location durations as y
    for (var i = 0; i < route.length; i++) {
        if (route[i - 1] != undefined) { //&& route[i].location == route[i - 1].location) {
            var duration = route[i - 1] != undefined ? route[i].timestamp.getTime() - route[i-1].timestamp.getTime() : 0;
            totalDur += duration;

            locations[route[i].location] += duration;
        }

        data.push([i, ...Object.values(locations)]);
    }

    var routeBarGraphDurations = [];
    routeBarGraphDurations.push(...routeEdges);
    routeBarGraphDurations.push(...locationVisitDurations)
    routeBarGraphDurations.sort((a, b) => a.fromCheckData.timestamp.getTime() > b.fromCheckData.timestamp.getTime() ? 1
        : (a.fromCheckData.timestamp.getTime() < b.fromCheckData.timestamp.getTime() ? -1
            : a.toCheckData.timestamp.getTime() > b.toCheckData.timestamp.getTime() ? 1
                : a.toCheckData.timestamp.getTime() < b.toCheckData.timestamp.getTime() ? -1 : 0));

    if (routeBarGraphDurations[routeBarGraphDurations.length - 1].fromLocation != route[route.length - 1].location && routeBarGraphDurations[routeBarGraphDurations.length - 1].toCheckData.getCheckName() != route[route.length - 1].getCheckName()) {
        routeBarGraphDurations.push(new RouteEdge(routeBarGraphDurations[routeBarGraphDurations.length - 1].toCheckData, route[route.length-1]));
    }

    data2.push(["Route", ...routeBarGraphDurations.map(checkEdge => checkEdge.getDuration())])

    anychart.onDocumentReady(function () {

        // create data set on our data
        var dataSet = anychart.data.set(data);
        var dataSet2 = anychart.data.set(data2);

        var series = [];
        Object.values(locations).forEach(location => series.push(dataSet.mapAs({'x': 0, 'value': series.length + 1})))

        var series2 = [];
        Object.values(routeBarGraphDurations).forEach(checkEdge => series2.push(dataSet2.mapAs({'x': 0, 'value': series2.length + 1})))

        // create bar chart
        var chart = anychart.area();
        var bar = anychart.bar();

        // turn on chart animation
        chart.animation(true);

        // turn on the crosshair
        chart.crosshair().enabled(true).yLabel().enabled(false);
        chart.crosshair().enabled(true).xLabel().enabled(false);
        chart.crosshair().yStroke(null).xStroke('#fff').zIndex(99);

        // helper function to setup label settings for all series
        var setupSeries = function (graphRef, seriesData, name) {
            var s = graphRef.area(seriesData);
            s.stroke('3 #fff 1');
            s.fill(function () {
                return this.sourceColor + ' 0.8'
            });
            s.name(name);
            s.markers().zIndex(100);
            s.clip(false);
            s.hovered()
                .stroke('3 #fff 1')
                .markers().enabled(true).type('circle').size(4).stroke('1.5 #fff');
        };

        for (var i = 0; i < Object.values(locations).length; i++) {
            setupSeries(chart, series[i], Object.keys(locations)[i])
        }

        for (var i = 0; i < routeBarGraphDurations.length; i++) {
            var tempSeries = bar.bar(series2[i]);
            var tempSeriesName = routeBarGraphDurations[i].fromLocation == routeBarGraphDurations[i].toLocation ? routeBarGraphDurations[i].fromLocation : routeBarGraphDurations[i].fromLocation + " - " + routeBarGraphDurations[i].toLocation
            tempSeries.name(tempSeriesName);
            tempSeries.stroke('3 #fff 1');
            tempSeries.hovered().stroke('3 #fff 1');
        }

        // set interactivity and toolitp settings
        chart.interactivity().hoverMode('by-x');
        chart.tooltip().displayMode('union');

        // turn on legend
        chart.legend().enabled(true).fontSize(13).padding([0, 0, 25, 0]);

        // Set text formatter.
        chart.tooltip().titleFormat(function () {
            time = this.points.map(point => point.value).reduce((a, b) => a+b);
            return new Date(time).toISOString().substring(12, 19);
        });

        chart.tooltip().format(function () {
            return this.seriesName + ": " + new Date(this.value).toISOString().substring(14, 19);
        });

        bar.tooltip().format(function () {
            return this.seriesName + ": " + new Date(this.value).toISOString().substring(14, 19);
        });

        // force chart to stack values by Y scale.
        chart.yScale().stackMode('value');
        chart.yAxis().labels().format(function() {
            return new Date(this.value).toISOString().substring(12, 19);
        });
        bar.yScale().stackMode('value');
        bar.yAxis().labels().format(function() {
            return new Date(this.value).toISOString().substring(12, 19);
        });


        // Set up the item locations at their proper x position in the run
        for (var i = 0; i < Object.values(itemLocationMap).length; i++) {
            var itemLocations = Object.values(itemLocationMap)[i];
            var itemName = Object.keys(itemLocationMap)[i];
            if (!coreItems.includes(itemName) && !songs.includes(itemName) && medallions[itemName] == undefined) {
                continue;
            }

            itemLocations.forEach(check => {
                var locationIndex = itemLocations.indexOf(check);
                var checkIndex;
                for (var j = 0; j < route.length; j++) {
                    //if (route[j].getCheckName() == check.getCheckName()) {
                    if (route[j].dungeonIndex == check.dungeonIndex && route[j].chestIndex == check.chestIndex) {
                       checkIndex = j;
                       break;
                    }
                }

                var itemImageHeight = (.15 - .12 * route.length / 5 / 50);
                var itemImageWidth = Math.round(itemImageHeight * document.getElementById("routeGraphDiv").offsetHeight / document.getElementById("routeGraphDiv").offsetWidth * route.length);
                var rectangle = chart.annotations().rectangle({
                    xAnchor: checkIndex,
                    valueAnchor: totalDur * (.98 + (2 * (coreItems.includes(itemName)) + (medallions[itemName] != undefined)) * (itemImageHeight + .01)),
                    secondXAnchor: checkIndex + itemImageWidth,
                    secondValueAnchor: totalDur * (.98 + itemImageHeight + (2 * (coreItems.includes(itemName)) + (medallions[itemName] != undefined)) * (itemImageHeight + .01)),
                });

                var imageUrl;
                if (typeof items[itemName] == 'boolean') {
                    imageUrl = 'images/' + itemName + '.png';
                } else {
                    imageUrl = 'images/' + itemName + (locationIndex + 1) + '.png';
                }

                rectangle.fill({
                        src: imageUrl,
                        mode: 'stretch',
                        opacity: 1
                    });

                //disable interactivity for the Ellipse annotation
                rectangle.allowEdit(false);


                var verticalMarker = chart.lineMarker(i + locationIndex * 255);
                verticalMarker.value(checkIndex);
                verticalMarker.layout("vertical");
                verticalMarker.scale(chart.xScale());
                verticalMarker.stroke({color: '#e0e0e0', thickness: 1, lineCap: 'round', opacity: .2});

                /*var itemText = progressiveItemCanonicalNames[itemName] != undefined ? progressiveItemCanonicalNames[itemName][locationIndex] : itemName;
                var text = chart.textMarker(i + locationIndex * 255);
                text.value(checkIndex);
                text.axis(chart.xAxis());
                text.text(itemText);
                text.align("top");
                text.anchor("left-bottom");
                text.offsetX(-3);
                text.offsetY(-6.5 * itemText.length - 7);
                text.rotation(-90);
                text.fontColor("#e0e0e0");*/
            });
        }

        // set container id for the chart
        chart.container(document.getElementById("routeGraphDiv"));

        var background = chart.background();
        background.enabled(true);
        background.fill("black");

        // initiate chart drawing
        chart.draw();

        // set container id for the chart
        bar.container(document.getElementById("barGraphDiv"));

        var background = bar.background();
        background.enabled(true);
        background.fill("black");

        // initiate chart drawing
        bar.draw();
    });
}

function showSettings(sender) {
    if (editmode) {
        var r, c;
        var startdraw = false;
        for (r = 7; r >= 0 && !startdraw; r--) {
            if (!itemLayout[r] || !itemLayout[r].length) {
                itemGrid[r]['row'].style.display = 'none';
            } else {
                for (c = 0; c < 8; c++) {
                    if (!!itemLayout[r][c] && itemLayout[r][c] != 'blank') {
                        startdraw = true;
                        r++;
                        break;
                    }
                }

                if (!startdraw) {
                    itemGrid[r]['row'].style.display = 'none';
                    itemGrid[r]['half'].style.display = 'none';
                }
            }
        }

        for (; r >= 0; r--) {
            itemGrid[r]['row'].style.display = '';
            itemGrid[r]['button'].style.display = 'none';
        }

        editmode = false;
        updateGridItemAll();
        showTracker('mapdiv', document.getElementsByName('showmap')[0]);
        document.getElementById('itemconfig').style.display = 'none';

        sender.innerHTML = '🔧';
        saveCookie();
    } else {
        var x = document.getElementById('settings');
        if (!x.style.display || x.style.display == 'none') {
            x.style.display = 'initial';
            sender.innerHTML = 'X';
        } else {
            x.style.display = 'none';
            sender.innerHTML = '🔧';
        }
    }
}

function showTracker(target, sender) {
    if (sender.checked) {
        document.getElementById(target).style.display = '';
    }
    else {
        document.getElementById(target).style.display = 'none';
    }
}

function clickRowButton(row) {
    if (itemLayout[row].length % 2 == 0) {
        itemGrid[row]['button'].innerHTML = '-';
        itemGrid[row]['button'].style.backgroundColor = 'red';
        itemGrid[row][6]['item'].style.display = '';
        itemGrid[row]['half'].style.display = 'none';
        itemLayout[row][6] = 'blank';
    } else {
        itemGrid[row]['button'].innerHTML = '+';
        itemGrid[row]['button'].style.backgroundColor = 'green';
        itemGrid[row][6]['item'].style.display = 'none';
        itemGrid[row]['half'].style.display = '';
        document.getElementById(itemLayout[row][6]).style.opacity = 1;
        itemLayout[row].splice(-1, 1);
    }
    updateGridItem(row, 6);
}


function EditMode() {
    var r, c;

    for (r = 0; r < 8; r++) {
        itemGrid[r]['row'].style.display = '';
        itemGrid[r]['button'].style.display = '';
    }

    editmode = true;
    updateGridItemAll();
    showTracker('mapdiv', {checked: false});
    document.getElementById('settings').style.display = 'none';
    document.getElementById('itemconfig').style.display = '';

    document.getElementById('settingsbutton').innerHTML = 'Exit Edit Mode';
}


function ResetLayout() {
    initGridRow(defaultItemGrid);
}


function ResetTracker() {
    chests.forEach(chest => delete chest.isOpened);
    dungeons.forEach(dungeon => Object.values(dungeon.chestlist).forEach(chest => delete chest.isOpened));
    items = Object.assign(baseItems);
    medallions = Object.assign(defaultMedallions);

    updateGridItemAll();
    updateMap();
    saveCookie();
}


function createItemTracker(sender) {
    var r;
    for (r = 0; r < 8; r++) {
        itemGrid[r] = [];
        itemLayout[r] = [];

        itemGrid[r]['row'] = document.createElement('table');
        itemGrid[r]['row'].className = 'tracker';
        sender.appendChild(itemGrid[r]['row']);

        var tr = document.createElement('tr');
        itemGrid[r]['row'].appendChild(tr);

        itemGrid[r]['half'] = document.createElement('td');
        itemGrid[r]['half'].className = 'halfcell';
        tr.appendChild(itemGrid[r]['half']);

        var i;
        for (i = 0; i < 7; i++) {
            itemGrid[r][i] = [];
            itemLayout[r][i] = 'blank';

            itemGrid[r][i]['item'] = document.createElement('td');
            itemGrid[r][i]['item'].className = 'griditem';
            tr.appendChild(itemGrid[r][i]['item']);

            // Add dungeon selector popup if the item is a medallion
            if (medallions[defaultItemGrid[r][i]] !== undefined) {
                var dungeonSelector = document.createElement('div');
                dungeonSelector.className = "dungeonSelector";

                var dungeonSelectorGrid = document.createElement('table');
                dungeonSelectorGrid.className = 'grid';
                var gridIndex = 0;
                for (var row = 0; row < 2; ++row) {
                    var selectorRow = dungeonSelectorGrid.appendChild(document.createElement('tr'));
                    for (var col = 0; col < 4; ++col) {
                        var cell = selectorRow.appendChild(document.createElement('td'));
                        cell.style.backgroundImage = 'url(images/' + dungeonImg[++gridIndex] + '.png)';
                        cell.onclick = new Function("setMedallionDungeon(" + r + "," + i + "," + gridIndex + ")");
                    }
                }

                dungeonSelector.appendChild(dungeonSelectorGrid);

                itemGrid[r][i]['dungeonSelector'] = dungeonSelector;
                itemGrid[r][i]['item'].appendChild(dungeonSelector);
            } else {
                // Add tooltip
                var tooltip = document.createElement('div');
                tooltip.className = "tooltip";

                itemGrid[r][i]['tooltip'] = tooltip;
                itemGrid[r][i]['item'].appendChild(tooltip);

            }

            // Add child with bg img
            var gridItemBackground = document.createElement('div');
            gridItemBackground.className = "griditembackground";
            itemGrid[r][i]['gridItemBackground'] = gridItemBackground;
            itemGrid[r][i]['item'].appendChild(gridItemBackground);

            var tdt = document.createElement('table');
            tdt.className = 'lonk';
            gridItemBackground.appendChild(tdt);

                var tdtr1 = document.createElement('tr');
                tdt.appendChild(tdtr1);
                    itemGrid[r][i][0] = document.createElement('th');
                    itemGrid[r][i][0].className = 'corner';
                    itemGrid[r][i][0].onclick = new Function("gridItemClick(" + r + "," + i + ",0)");
                    tdtr1.appendChild(itemGrid[r][i][0]);
                    itemGrid[r][i][1] = document.createElement('th');
                    itemGrid[r][i][1].className = 'corner';
                    itemGrid[r][i][1].onclick = new Function("gridItemClick(" + r + "," + i + ",1)");
                    tdtr1.appendChild(itemGrid[r][i][1]);
                var tdtr2 = document.createElement('tr');
                tdt.appendChild(tdtr2);
                    itemGrid[r][i][2] = document.createElement('th');
                    itemGrid[r][i][2].className = 'corner';
                    itemGrid[r][i][2].onclick = new Function("gridItemClick(" + r + "," + i + ",2)");
                    tdtr2.appendChild(itemGrid[r][i][2]);
                    itemGrid[r][i][3] = document.createElement('th');
                    itemGrid[r][i][3].className = 'corner';
                    itemGrid[r][i][3].onclick = new Function("gridItemClick(" + r + "," + i + ",3)");
                    tdtr2.appendChild(itemGrid[r][i][3]);
        }

        var half = document.createElement('td');
        half.className = 'halfcell';
        tr.appendChild(half);
        itemGrid[r]['button'] = document.createElement('button');
        itemGrid[r]['button'].innerHTML = '-';
        itemGrid[r]['button'].style.backgroundColor = 'red';
        itemGrid[r]['button'].style.color = 'white';
        itemGrid[r]['button'].onclick = new Function("clickRowButton(" + r + ")");
        half.appendChild(itemGrid[r]['button']);
    }
}

function updateGridItem(row, index) {
    var item = itemLayout[row][index];
    var itemDOM = itemGrid[row][index]['gridItemBackground'];
    var itemTooltipDOM = itemGrid[row][index]['tooltip'];

    // If item is blank, a medallion, or skulls, ensure no tooltip is shown
    if (itemTooltipDOM != undefined && (!item || item == 'blank' || medallions[item] !== undefined || item.includes("Skulltula"))) {
        itemTooltipDOM.style.opacity = 0;
    }

    if (editmode) {
        if (!item || item == 'blank') {
            itemDOM.style.backgroundImage = 'url(images/blank.png)';
        } else if ((typeof items[item]) == 'boolean') {
            itemDOM.style.backgroundImage = 'url(images/' + item + '.png)';
        } else {
            itemDOM.style.backgroundImage = 'url(images/' + item + itemsMax[item] + '.png)';
        }

        itemDOM.style.border = '1px solid white';
        itemDOM.style.opacity = 1;

        return;
    }

    itemDOM.style.border = '0px';
    itemDOM.style.opacity = '';

    if (!item || item == 'blank') {
        itemDOM.style.backgroundImage = '';
        return;
    }

    if ((typeof items[item]) == 'boolean') {
        itemDOM.style.backgroundImage = 'url(images/' + item + '.png)';
    } else {
        itemDOM.style.backgroundImage = 'url(images/' + item + items[item] + '.png)';
    }

    itemDOM.className = 'griditembackground ' + !!items[item];

    // If this item has associated locations and is not a tooltip-less type
    if (itemTooltipDOM != undefined && itemLocationMap[item] != undefined && !(!item || item == 'blank' || medallions[item] !== undefined || item.includes("Skulltula"))) {
        // Create an unordered list of locations
        var tooltipListDOM = document.createElement('ul');
        if (!itemTooltipDOM.firstChild) {
            itemTooltipDOM.appendChild(tooltipListDOM);
        } else {
            itemTooltipDOM.replaceChild(tooltipListDOM, itemTooltipDOM.firstChild);
        }

        // Append list items for each location
        for (var i = 0; i < itemLocationMap[item].length; i++) {
          var tooltipListItemDOM = document.createElement('li');
          tooltipListItemDOM.innerHTML = itemLocationMap[item][i].getCheckName();
          tooltipListDOM.appendChild(tooltipListItemDOM);
          if (i != itemLocationMap[item].length - 1) {
              tooltipListDOM.appendChild(document.createElement('hr'));
          }
        }

        itemTooltipDOM.style.opacity = 1;
    } else if (itemTooltipDOM != undefined) {
        if (itemTooltipDOM.firstChild) {
            itemTooltipDOM.firstChild.remove();
        }
        itemTooltipDOM.style.opacity = 0;
    }

    if (medallions[item] !== undefined) {
        if (showprizes) {
            // Magic number "3" refers to bottom right corner in the itemGrid object
            itemGrid[row][index][3].style.backgroundImage = 'url(images/' + dungeonImg[medallions[item]] + '.png)';
        } else {
            // Magic number "3" refers to bottom right corner in the itemGrid object
            itemGrid[row][index][3].style.backgroundImage = '';
        }
    }
}

function updateGridItemAll() {
    for (r = 0; r < 8; r++) {
        for (c = 0; c < 7; c++) {
            updateGridItem(r, c);
        }
    }
}

function setGridItem(item, row, index) {
    var previtem = itemLayout[row][index];
    itemLayout[row][index] = item;
    if (item != 'blank') {
        document.getElementById(item).style.opacity = 0.25;
    }
    updateGridItem(row, index);
}

function initGridRow(itemsets) {
    var r, c;
    var startdraw = false;
    for (r = 7; r >= 0 && !startdraw; r--) {
        if (!itemsets[r] || !itemsets[r].length) {
            itemGrid[r]['row'].style.display = 'none';
            itemGrid[r]['half'].style.display = 'none';
        } else {
            for (c = 0; c < 8; c++) {
                if (!!itemsets[r][c] && itemsets[r][c] != 'blank') {
                    startdraw = true;
                    r++;
                    break;
                }
            }

            if (!startdraw) {
                itemGrid[r]['row'].style.display = 'none';
                itemGrid[r]['half'].style.display = 'none';
            }
        }
    }

    for (; r >= 0; r--) {
        itemGrid[r]['row'].style.display = '';

        if (itemsets[r].length % 2 != 0) {
            itemGrid[r]['half'].style.display = 'none';
            itemGrid[r][6]['item'].style.display = '';
        } else {
            clickRowButton(r);
        }
        itemGrid[r]['button'].style.display = 'none';

        for (c = 0; c < 7; c++) {
            if (itemsets[r][c]) {
                setGridItem(itemsets[r][c], r, c);
            }
        }
    }
}

function gridItemClick(row, col, corner) {
    if (editmode) {
        gridItemClickEdit(row, col, corner);
    }

    var item = itemLayout[row][col];

    // Case when you clicked a medallion (detected by inclusion in medallions list)
    if (medallions[item] !== undefined && showprizes) {
        // Case when you click the question mark corner
        if (corner == 3) {
            itemGrid[row][col]["dungeonSelector"].style.visibility = 'visible';
        } else {
            // Case when you click the medallion itself
            items[item] = !items[item];

            if (items[item]) {
                handleItemPickup(item)
            } else {
                handleItemDrop(item)
            }
        }
    } else if ((typeof items[item]) == 'boolean') {
        // Case when the item is boolean
        items[item] = !items[item];

        if (items[item]) {
            handleItemPickup(item)
        } else {
          handleItemDrop(item)
        }
    } else {
        // Case when the item is progressive
        items[item]++;
        if (items[item] > itemsMax[item]) {
            items[item] = itemsMin[item];
            handleItemDrop(item)
        } else {
          handleItemPickup(item)
        }
    }

    updateMap();
    updateGridItem(row, col);
    saveCookie();
}

/**
 * Handles logic when the user clicks an item in the grid while in edit mode.
 */
function gridItemClickEdit(row, col, corner) {
    if (selected.item) {
        document.getElementById(selected.item).style.border = '1px solid white';
        var old = itemLayout[row][col];

        if (old == selected.item) {
            selected = {};
            return;
        }

        if (selected.item != 'blank') {
            document.getElementById(selected.item).style.opacity = 0.25;

            var r,c;
            var found = false;
            for (r = 0; r < 8; r++) {
                for (c = 0; c < 7; c++) {
                    if (itemLayout[r][c] == selected.item) {
                        itemLayout[r][c] = 'blank';
                        found = true;
                        break;
                    }
                }

                if (found) {
                    break;
                }
            }
        }

        itemLayout[row][col] = selected.item;
        updateGridItem(row, col);

        document.getElementById(old).style.opacity = 1;

        selected = {};
    } else if (selected.row !== undefined) {
        itemGrid[selected.row][selected.col]['item'].style.border = '1px solid white';

        var temp = itemLayout[row][col];
        itemLayout[row][col] = itemLayout[selected.row][selected.col];
        itemLayout[selected.row][selected.col] = temp;
        updateGridItem(row, col);
        updateGridItem(selected.row, selected.col);

        selected = {};
    } else {
        itemGrid[row][col]['item'].style.border = '3px solid yellow';
        selected = {row: row, col: col};
    }
}

function updateMap() {
    for (k = 0; k < chests.length; k++) {
        if (!chests[k].isOpened)
            document.getElementById(k).className = 'mapspan chest ' + chests[k].isAvailable();
    }
    for (k = 0; k < dungeons.length; k++) {
        document.getElementById('dungeon' + k).className = 'mapspan dungeon ' + dungeons[k].canGetChest();

        var DCcount = 0;
        for (var key in dungeons[k].chestlist) {
            if (dungeons[k].chestlist.hasOwnProperty(key)) {
                if (!dungeons[k].chestlist[key].isOpened && dungeons[k].chestlist[key].isAvailable()) {
                    DCcount++;
                }
            }
        }

        var child = document.getElementById('dungeon' + k).firstChild;
        while (child) {
            if (child.className == 'chestCount') {
                if (DCcount == 0) {
                    child.innerHTML = '';
                } else {
                    child.innerHTML = DCcount;
                }
                break;
            }
            child = child.nextSibling;
        }
    }

    document.getElementById('submaparea').className = 'DC' + dungeons[dungeonSelect].isBeatable();
    var itemlist = document.getElementById('submaplist').children;
    for (var item in itemlist) {
        if (itemlist.hasOwnProperty(item)) {
            if ( dungeons[dungeonSelect].chestlist[itemlist[item].innerHTML].isOpened) {
                itemlist[item].className = 'DCopened';
            } else if ( dungeons[dungeonSelect].chestlist[itemlist[item].innerHTML].isAvailable()) {
                itemlist[item].className = 'DCavailable';
            } else {
                itemlist[item].className = 'DCunavailable';
            }
        }
    }
}

function itemConfigClick (sender) {
    var item = sender.id;

    if (selected.item) {
        document.getElementById(selected.item).style.border = '0px';
        sender.style.border = '3px solid yellow';
        selected = {item: item};
    } else if (selected.row !== undefined) {
        itemGrid[selected.row][selected.col]['item'].style.border = '1px solid white';
        var old = itemLayout[selected.row][selected.col];

        if (old == item) {
            selected = {};
            return;
        }

        if (item != 'blank') {
            sender.style.opacity = 0.25;

            var r, c;
            var found = false;
            for (r = 0; r < 8; r++) {
                for (c = 0; c < 7; c++) {
                    if (itemLayout[r][c] == item) {
                        itemLayout[r][c] = 'blank';
                        updateGridItem(r, c);
                        found = true;
                        break;
                    }
                }

                if (found) {
                    break;
                }
            }
        }

        itemLayout[selected.row][selected.col] = item;
        updateGridItem(selected.row, selected.col);

        document.getElementById(old).style.opacity = 1;

        selected = {};
    } else {
        sender.style.border = '3px solid yellow';
        selected = {item: item}
    }
}

function populateMapdiv() {
    var mapdiv = document.getElementById('mapdiv');

    // Initialize all chests on the map
    for (k = 0; k < chests.length; k++) {
        var s = document.createElement('span');
        s.style.backgroundImage = 'url(images/poi.png)';
        s.style.color = 'black';
        s.id = k;
        s.onclick = new Function('toggleChest(' + k + ', false)');
        s.onauxclick = new Function('toggleChest(' + k + ', true)');
        s.onmouseover = new Function('highlight(' + k + ')');
        s.onmouseout = new Function('unhighlight(' + k + ')');
        s.style.left = chests[k].x;
        s.style.top = chests[k].y;
        if (chests[k].isOpened) {
            s.className = 'mapspan chest opened';
        } else {
            s.className = 'mapspan chest ' + chests[k].isAvailable();
        }

        var ss = document.createElement('span');
        ss.className = 'tooltip';
        ss.innerHTML = chests[k].name;
        s.appendChild(ss);

        mapdiv.appendChild(s);
    }

    // Dungeon bosses & chests
    for (k=0; k<dungeons.length; k++) {
        s = document.createElement('span');
        s.style.backgroundImage = 'url(images/poi.png)';
        s.id = 'dungeon' + k;

        s.onclick = new Function('clickDungeon(' + k + ')');
        s.onmouseover = new Function('highlightDungeon(' + k + ')');
        s.onmouseout = new Function('unhighlightDungeon(' + k + ')');
        s.style.left = dungeons[k].x;
        s.style.top = dungeons[k].y;
        s.className = 'mapspan dungeon ' + dungeons[k].canGetChest();

        var DCcount = 0;
        for (var key in dungeons[k].chestlist) {
            if (dungeons[k].chestlist.hasOwnProperty(key)) {
                if (!dungeons[k].chestlist[key].isOpened && dungeons[k].chestlist[key].isAvailable()) {
                    DCcount++;
                }
            }
        }

        var ss = document.createElement('span');
        ss.className = 'chestCount';
        if (DCcount == 0) {
            ss.innerHTML = '';
        } else {
            ss.innerHTML = DCcount;
        }
        ss.style.color = 'black'
        s.style.textAlign = 'center';
        ss.display = 'inline-block';
        ss.style.lineHeight = '24px';
        s.appendChild(ss);

        var ss = document.createElement('span');
        ss.className = 'tooltipdungeon';
        ss.innerHTML = dungeons[k].name;
        s.appendChild(ss);

        mapdiv.appendChild(s);
    }

    // Update the DOM object that shows the dungeon name in the submaparea
    var dungeonNameDOM = document.getElementById('submaparea');
    dungeonNameDOM.innerHTML = dungeons[dungeonSelect].name;
    dungeonNameDOM.onclick = new Function('toggleDungeon(this, false,' + dungeonSelect + ')');
    dungeonNameDOM.onauxclick = new Function('toggleDungeon(this, true,' + dungeonSelect + ')');
    dungeonNameDOM.onmouseover = new Function('highlightListItem(this)');
    dungeonNameDOM.onmouseout = new Function('unhighlightListItem(this)');
    dungeonNameDOM.style.cursor = 'pointer';
    dungeonNameDOM.className = 'DC' + dungeons[dungeonSelect].isBeatable();

    document.getElementById('dungeon' + dungeonSelect).style.backgroundImage = 'url(images/highlighted.png)';
    for (var key in dungeons[dungeonSelect].chestlist) {
        var dungeonCheckDOM = document.createElement('li');
        dungeonCheckDOM.innerHTML = key

        if (dungeons[dungeonSelect].chestlist[key].isOpened) {
            dungeonCheckDOM.className = 'DCopened';
        }
        else if ( dungeons[dungeonSelect].chestlist[key].isAvailable()) {
            dungeonCheckDOM.className = 'DCavailable';
        }
        else {
            dungeonCheckDOM.className = 'DCunavailable';
        }

        // NOTE: this uses the innerHTML as the chest name. This is a hack because a reference to "key" was not working
        dungeonCheckDOM.onclick = new Function('toggleDungeonChest(this, false, dungeonSelect, this.innerHTML)');
        dungeonCheckDOM.onauxclick = new Function('toggleDungeonChest(this, true, dungeonSelect, this.innerHTML)');
        dungeonCheckDOM.onmouseover = new Function('highlightListItem(this)');
        dungeonCheckDOM.onmouseout = new Function('unhighlightListItem(this)');
        dungeonCheckDOM.style.cursor = 'pointer';

        document.getElementById('submaplist').appendChild(dungeonCheckDOM);
    }
}

function populateItemconfig() {
    var grid = document.getElementById('itemconfig');

    var i = 0;

    var row;

    for (var key in items) {
        if (i % 10 == 0) {
            row = document.createElement('tr');
            grid.appendChild(row);
        }
        i++;

        var rowitem = document.createElement('td');
        rowitem.className = 'corner';
        rowitem.id = key;
        rowitem.style.backgroundSize = '100% 100%';
        rowitem.onclick = new Function('itemConfigClick(this)');
        if ((typeof items[key]) == 'boolean') {
            rowitem.style.backgroundImage = 'url(images/' + key + '.png)';
        } else {
            rowitem.style.backgroundImage = 'url(images/' + key + itemsMax[key] + '.png)';
        }
        row.appendChild(rowitem);
    }
}

function isBridgeOpen() {
    switch (ganonlogic) {
        case 'Open':
            return true;
        case 'Vanilla':
            return items['ShadowMedallion'] && items['SpiritMedallion'];
        case 'Medallions':
            return items['ForestMedallion'] &&
                items['FireMedallion'] &&
                items['WaterMedallion'] &&
                items['LightMedallion'] &&
                items['ShadowMedallion'] &&
                items['SpiritMedallion'];
        case 'Dungeons':
            return items['KokiriEmerald'] &&
                items['GoronRuby'] &&
                items['ZoraSapphire'] &&
                items['ForestMedallion'] &&
                items['FireMedallion'] &&
                items['WaterMedallion'] &&
                items['LightMedallion'] &&
                items['ShadowMedallion'] &&
                items['SpiritMedallion'];
    }
    return false;
}

function init() {
    createItemTracker(document.getElementById('itemdiv'));
    populateMapdiv();
    populateItemconfig();

    loadCookie();
    saveCookie();
}

function preloader() {
    for (item in items) {
        if ((typeof items[item]) == 'boolean') {
            var img = new Image();
            img.src = 'images/' + item + '.png';
        } else {
            for (i = itemsMin[item]; i < itemsMax[item]; i++) {
                var img = new Image();
                img.src = 'images/' + item + i + '.png';
            }
        }
    }

    for (medallion in dungeonImg) {
        var img = new Image();
        img.src = 'images/' + dungeonImg[medallion] + '.png';
    }
}
function addLoadEvent(func) {
    var oldonload = window.onload;
    if (typeof window.onload != 'function') {
        window.onload = func;
    } else {
        window.onload = function() {
            if (oldonload) {
                oldonload();
            }
            func();
        }
    }
}
addLoadEvent(preloader);
