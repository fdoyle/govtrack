var glob = require('glob');
var fs = require('fs');
var neo4j = require('neo4j');
var async = require('async');


var INSERT_BILL = 'CREATE (bill:BILL {data}) RETURN bill';

function getBillFiles(callback) {
    console.log("getting bill files");
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
    console.log("reading data for files");
    console.log("number of files: " + fileList.length);
    async.mapSeries(fileList, async.ensureAsync(readDataForFile), callback);
}

function loadBillsIntoDatabase(billList, callback) {
    console.log("loading bills into database");
    async.mapSeries(billList, async.ensureAsync(loadBillIntoDatabase), callback);
}

function loadBillIntoDatabase(billJson, callback) {
    var billDao = transformBillForDatabase(billJson);
    console.log(JSON.stringify(billDao));
    db.cypher({
        query:INSERT_BILL,
        params: {
            data:billDao
        }
    }, function(err, data) {
        callback(err, data);
    });
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

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');

async.waterfall([
    getBillFiles,
    readDataForFiles,
    loadBillsIntoDatabase
], function(err, results) {
    if(err) throw err;
    console.log("done");
})
