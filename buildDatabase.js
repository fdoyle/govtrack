var glob = require('glob');
var fs = require('fs');
var neo4j = require('neo4j');
var async = require('async');
var parseCsv = require('csv-parse');

var QUERY_CLEAR_DB = 'MATCH (n) DETACH DELETE n';
var INSERT_BILL =
    "MATCH (sponsor:LEGISLATOR {thomasId: {billId}}) " +
    "CREATE (bill:BILL {data}) " +
    "CREATE (sponsor)-[:SPONSOR]->(bill) " +
    "RETURN bill";
var QUERY_INSERT_LEGISLATOR = 'CREATE (legislator:LEGISLATOR {data}) RETURN legislator';

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');

function setupDatabase() {
    async.series([
        clearDatabase,
        loadLegislators,
        loadBills
    ])
}

//Clear database
function clearDatabase(callback) {
    console.log("Clearing Database");
    db.cypher({
        query: QUERY_CLEAR_DB
    }, callback);
    //todo add constraints
}


//Load Bills
function getBillFiles(callback) {
    console.log("Searching for bill files");
    glob("bills/hr/**/data.json", callback);
}

function readDataForFile(fileName, callback) {
    fs.readFile(fileName, {
        encoding: "utf-8",
        autoClose: true
    }, function(err, dataString) {
        if (err) {
            console.log(err);
        } else {
            callback(err, JSON.parse(dataString));
        }
    })
}

function readDataForFiles(fileList, callback) {
    console.log("Reading data for " + fileList.length + " bills");
    async.mapSeries(fileList, async.ensureAsync(readDataForFile), callback);
}

function loadBillsIntoDatabase(billList, callback) {
    console.log("Loading bills into database");
    async.mapSeries(billList, async.ensureAsync(loadBillIntoDatabase), callback);
}

function loadBillIntoDatabase(billJson, callback) {
    var billDao = transformBillForDatabase(billJson);
    db.cypher({
        query: INSERT_BILL,
        params: {
            data: billDao,
            billId: billDao.introducedByThomasId
        }
    }, callback);
}

function transformBillForDatabase(bill) {
    var billDao = {};
    billDao.congress = bill.congress;
    billDao.number = bill.number;
    billDao.title = bill.short_title;
    if (billDao.title == null) {
        billDao.title = "NO TITLE";
    }
    billDao.id = bill.bill_id;
    billDao.officialTitle = bill.officialTitle;
    billDao.url = bill.url;
    billDao.introducedDate = bill.introduced_at;
    billDao.introducedByThomasId = bill.sponsor.thomas_id;
    return billDao;
}

function loadBills(callback) {
    console.log("Loading Bills")
    async.waterfall([
        getBillFiles,
        readDataForFiles,
        loadBillsIntoDatabase
    ], callback);
}


//Load Congress

function loadLegislators(callback) {
    console.log("Loading Congress")
    async.waterfall([
        getCongressFiles,
        readDataForCongressFiles,
        loadLegislatorsIntoDatabase
    ], callback);
}

function getCongressFiles(callback) {
    console.log("Searching for congress files");
    glob("congress-legislators/legislators-current.csv", callback);
}

function readDataForCongressFiles(fileList, callback) {
    console.log("Reading data for congress");
    async.mapSeries(fileList, async.ensureAsync(readDataForCongressFile), callback); //returns array of arrays. outer represents files loaded, and so generally only has one item
}

function readDataForCongressFile(fileName, callback) {
    var parser = parseCsv({
        columns: true
    }, callback);
    fs.createReadStream(fileName).pipe(parser);
}

function transformLegislatorForDatabase(legislator) {
    var legislatorDao = {}
    legislatorDao.firstName = legislator.first_name;
    legislatorDao.lastName = legislator.last_name;
    legislatorDao.birthday = legislator.birthday;
    legislatorDao.gender = legislator.gender;
    legislatorDao.repType = legislator["type"];
    legislatorDao.state = legislator.state;
    legislatorDao.party = legislator.party; //todo make this a relationship
    legislatorDao.govtrackId = legislator.govtrack_id;
    legislatorDao.thomasId = legislator.thomas_id;
    legislatorDao.url = legislator.url;
    return legislatorDao;
}

function loadLegislatorsIntoDatabase(legislators, callback) {
    console.log("Loading legislators into database");
    async.mapSeries(legislators[0], async.ensureAsync(loadLegislatorIntoDatabase), callback);
}

function loadLegislatorIntoDatabase(legislator, callback) {
    var legislatorDao = transformLegislatorForDatabase(legislator);
    db.cypher({
        query: QUERY_INSERT_LEGISLATOR,
        params: {
            data: legislatorDao
        }
    }, callback);
}




setupDatabase();
