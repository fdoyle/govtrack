var glob = require('glob');
var fs = require('fs');
var neo4j = require('neo4j');
var async = require('async');

var QUERY_CLEAR_DB = 'MATCH (n) DETACH DELETE n';
var INSERT_BILL = 'CREATE (bill:BILL {data}) RETURN bill';

//Clear database
function clearDatabase(callback) {
    console.log("Clearing Database");
    db.cypher({
        query:QUERY_CLEAR_DB
    },callback);
}


//LOAD BILLS
function getBillFiles(callback) {
    console.log("Searching for bill files");
    glob("bills/hr/**/data.json", callback);
}


function readDataForFile(fileName, callback) {
    fs.readFile(fileName, {encoding:"utf-8", autoClose:true}, function(err, dataString) {
        if(err) {
            console.log(err);
        } else {
            callback(err, JSON.parse(dataString));
        }
    })
}

function readDataForFiles(fileList, callback) {
    console.log("Reading data for " + fileList.length + " files");
    async.mapSeries(fileList, async.ensureAsync(readDataForFile), callback);
}

function loadBillsIntoDatabase(billList, callback) {
    console.log("Loading bills into database");
    async.mapSeries(billList, async.ensureAsync(loadBillIntoDatabase), callback);
}

function loadBillIntoDatabase(billJson, callback) {
    var billDao = transformBillForDatabase(billJson);
    db.cypher({
        query:INSERT_BILL,
        params: {
            data:billDao
        }
    }, callback);
}

function transformBillForDatabase(bill) {
    var billDao = {};
    billDao.congress = bill.congress;
    billDao.number = bill.number;
    billDao.title = bill.short_title;
    if(billDao.title == null) {
        billDao.title = "NO TITLE";
    }
    billDao.id = bill.bill_id;
    billDao.officialTitle = bill.officialTitle;
    billDao.url = bill.url;
    billDao.introducedData = bill.introduced_at;
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

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');


function setupDatabase() {
    async.series([
        clearDatabase,
        loadBills
    ])
}

setupDatabase();
