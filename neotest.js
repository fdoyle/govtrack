var glob = require('glob');
var fs = require('fs');
var neo4j = require('neo4j');

var db = new neo4j.GraphDatabase('http://neo4j:p4ssw0rd@localhost:7474');


addItem({derp:'foo'});

function addItem(item) {
    db.cypher({
        query:'CREATE (user:DERP {data}) RETURN user',
        params: {
            data: item
        }
    }, function(a,b) {
        console.log(a);
        console.log(b);
    })
}

function displayAll() {
    db.cypher({
        query:'MATCH (a) RETURN a'
    }, function(err, results) {
        if(err) throw err;
        console.log(JSON.stringify(results));
    });
}
