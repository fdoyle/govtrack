# govtrack
fill a graph database with some US congress voting data

run

>rsync -avz --delete --delete-excluded --exclude **/text-versions/ \
>		govtrack.us::govtrackdata/congress/113/bills .

in root directory to pull down data. 
