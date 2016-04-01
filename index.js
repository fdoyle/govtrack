var express = require('express');
var app = express();
var neo4j = require('neo4j');

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');

app.get('/', function(req, res) {
    res.send('Welcome to GovTrack');
})

var QUERY_BILLS = "MATCH (att:VOTE_ATTEMPT)-[:ATTEMPT_FOR]->(bill:BILL) " +
"MATCH (voterYea:LEGISLATOR)-[voteFor:VOTED {type:\"Yea\"}]->(att) " +
"WITH count(voterYea) AS yeas, att, bill " +
"MATCH (voterNay:LEGISLATOR)-[voteFor:VOTED {type:\"Nay\"}]->(att) " +
"RETURN bill.title as title,yeas, count(voterNay) as nays, att.requires as requires,  att.result as result";

app.get('/bills', function(req, res) {
    console.log("received request for all bills");
    db.cypher({
        query: QUERY_BILLS
    }, function(err, data) {
        if(err) throw err;
        res.send(JSON.stringify(data, null, 3));
        console.log(JSON.stringify(data, null, 3));
    });
});

app.listen(3000, function() {
    console.log('listening on port 3000');
});
