#!/bin/bash
# You can familiarize yourself with the contents of our bulk data by browsing
# http://www.govtrack.us/data/congress-legislators/ and http://www.govtrack.us/data/congress/.
# Get an idea for the directory structure and what the files look like.

rsync -avz --delete --delete-excluded --exclude **/text-versions/ \
		govtrack.us::govtrackdata/congress/113/bills .


# https://www.govtrack.us/data/congress-legislators/


rsync -avz --delete --delete-excluded --exclude **/text-versions/ \
		govtrack.us::govtrackdata/congress-legislators/*.csv ./congress-legislators


rsync -avz --delete --delete-excluded --exclude **/text-versions/ \
		govtrack.us::govtrackdata/congress/113/votes/**/data.json .
