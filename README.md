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

todo:
 - add some organizations (senate, house; dem, rep; committees)
 - add some tags (already in bill data, ex: all bills dealing with taxation, military)
 - add some express magic to get an api going

done:
- load legislation
- load legislators
- show sponsorship
- legislator party
- load voting data
