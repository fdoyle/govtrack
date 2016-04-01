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
var QUERY_INSERT_LEGISLATOR =
    "CREATE (legislator:LEGISLATOR {data}) " +
    "MERGE (party:PARTY {party:{partyName}}) " +
    "CREATE (legislator)-[rel:MEMBER]->(party) " +
    "RETURN legislator";
var QUERY_INSERT_VOTE =
    "MATCH (voter:LEGISLATOR {voterId: {voterIdData}}) " +
    "MATCH (bill:BILL {id:{billIdData}}) " +
    "MERGE (attempt:VOTE_ATTEMPT {result:{attemptData}.result, requires:{attemptData}.requires, date:{attemptData}.date, question:{attemptData}.question, url:{attemptData}.url, id:{attemptData}.id}) " +
    "CREATE (voter)-[:VOTED {data}]->(attempt) " +
    "MERGE (attempt)-[:ATTEMPT_FOR]->(bill) " +
    "RETURN voter, bill";

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');

function setupDatabase() {
    async.series([
        clearDatabase,
        loadLegislators,
        loadBills,
        loadVotes
    ], function(err, data) {
        if (err) throw err;
    })
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
            billId: billDao.sponsorThomasId
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
    billDao.sponsorThomasId = bill.sponsor.thomas_id;
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
    legislatorDao.voterId = legislator.bioguide_id;
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
            data: legislatorDao,
            partyName: legislator.party
        }
    }, callback);
}

//Load votes

function loadVotes(callback) {
    console.log("Loading Votes");
    async.waterfall([
        getVoteFiles,
        readDataForVoteFiles,
        loadVotesForAllBillsIntoDatabase
    ], callback);
}

function getVoteFiles(callback) {
    console.log("Searching for vote files");
    glob("votes/*/*/data.json", callback);
}

//callback with err, list of vote attempts
function readDataForVoteFiles(fileList, callback) {
    console.log("Reading data for "+ fileList.length + " files");
    async.mapSeries(fileList, async.ensureAsync(readDataForVoteFile), callback);
}

//callback with err, data for vote file
function readDataForVoteFile(fileName, callback) {
    fs.readFile(fileName, {
        encoding: "utf-8",
        autoClose: true
    }, function(err, dataString) {
        callback(err, JSON.parse(dataString));
    })
}

function transformVoteForDatabase(voteType) {
    var voteDao = {};
    voteDao.type = voteType;
    return voteDao;
}

function transformAttemptForDatabase(attemptData) {
    var attemptDao = {};
    attemptDao.result = attemptData.result;
    attemptDao.requires = attemptData.requires;
    attemptDao.date = attemptData.date;
    attemptDao.question = attemptData.question;
    attemptDao.url = attemptData.source_url;
    attemptDao.id = attemptData.bill.type + attemptData.bill.number + "-" + attemptData.bill.congress;
    return attemptDao;
}

function loadVotesForAllBillsIntoDatabase(votesOnAllBills, callback) {
    console.log("Loading data for " + votesOnAllBills.length + " bills");
    async.eachSeries(votesOnAllBills, loadVotesForBillIntoDatabase, callback);
}

function loadVotesForBillIntoDatabase(billData, callback) {
    console.log("Loading votes for bill into database");
    if (billData.bill == null) {
        console.log("not a bill");
        async.waterfall([], callback);
    } else {
        console.log("is a bill");
        var nayVotes = billData.votes.Nay;
        var notVotingVotes = billData.votes["Not Voting"];
        var presentVotes = billData.votes.Present;
        var yeaVotes = billData.votes.Yea;

        async.waterfall([
            function(callback2) { //load nay votes
                loadVotesOfTypeToDatabase(billData, nayVotes, "Nay", callback2)
            },
            function(ignore, callback2) { //load not voting votes
                loadVotesOfTypeToDatabase(billData, notVotingVotes, "Not Voting", callback2)
            },
            function(ignore, callback2) { //load present votes
                loadVotesOfTypeToDatabase(billData, presentVotes, "Present", callback2)
            },
            function(ignore, callback2) { //load yea votes
                loadVotesOfTypeToDatabase(billData, yeaVotes, "Yea", callback2)
            }
        ], function(err, result) {
            callback(err);
        });
    }
}

function loadVotesOfTypeToDatabase(attemptData, votesOnBillCollection, type, callback) {
    console.log("loading votes of type into database")
    attemptDao = transformAttemptForDatabase(attemptData);
    async.eachSeries(votesOnBillCollection, function(singleVoteOnBill, callback2) {
        var singleVoteDao = transformVoteForDatabase(type);
        var billId = attemptData.bill.type + attemptData.bill.number + "-" + attemptData.bill.congress;
        loadVoteIntoDatabase(attemptDao, singleVoteDao, singleVoteOnBill.id, callback2);
    }, function(err) {
        console.log("finished loading votes of type into database");
        callback(err, null);
    });
}

function loadVoteIntoDatabase(attemptDao, voteDao, voterIdValue, callback) {
    console.log("loading vote into database")
    console.log("attemptDao "+ JSON.stringify(attemptDao, null, 2));
    console.log("voteDao " + JSON.stringify(voteDao, null, 2));
    console.log("voterIdValue " + voterIdValue);
    db.cypher({
        query: QUERY_INSERT_VOTE,
        params: {
            data: voteDao,
            voterIdData: voterIdValue,
            billIdData: attemptDao.id,
            attemptData: attemptDao
        }
    }, callback);
}

setupDatabase();
