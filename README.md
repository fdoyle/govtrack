# govtrack
fill a graph database with some US congress voting data

interesting queries:

Bills introduced by democrats:
>MATCH (bill:BILL)<-[:SPONSOR]-(legislator:LEGISLATOR)-[:MEMBER]->(party:PARTY {party:"Democrat"})

>RETURN bill

All votes on all bills
>MATCH (voter:LEGISLATOR)-[vote:VOTED]->(att:VOTE_ATTEMPT)

>MATCH (att)-[:ATTEMPT_FOR]->(bill:BILL)

>RETURN voter, vote, bill

>LIMIT 50;

Voting results on all bills:
>MATCH (att:VOTE_ATTEMPT)-[:ATTEMPT_FOR]->(bill:BILL)

>MATCH (voterYea:LEGISLATOR)-[voteFor:VOTED {type:"Yea"}]->(att)

>WITH count(voterYea) AS yeas, att, bill

>MATCH (voterNay:LEGISLATOR)-[voteFor:VOTED {type:"Nay"}]->(att)

>return bill.title,yeas, count(voterNay) as Nays, att.requires,  att.result

>LIMIT 100;

todo:
 - add endpoint for bills
 - add endpoint for legislators
 - add legislator detailed
 - add bill detail
 - add votes data
 - add some organizations (senate, house; dem, rep; committees)
 - add some tags (already in bill data, ex: all bills dealing with taxation, military)

done:
- load legislation
- load legislators
- show sponsorship
- legislator party
- load voting data
- add some express magic to get an api going
