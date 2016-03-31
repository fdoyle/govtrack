# govtrack
fill a graph database with some US congress voting data

run

>rsync -avz --delete --delete-excluded --exclude **/text-versions/ \
>		govtrack.us::govtrackdata/congress/113/bills .

in root directory to pull down data. 


todo:
 - load congressmen/senators
 - load voting data
 - add some organizations (senate, house; dem, rep; committees)
 - add some tags (already in bill data, ex: all bills dealing with taxation, military)
 - add some express magic to get an api going
