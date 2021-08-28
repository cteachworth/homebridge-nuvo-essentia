#!/bin/sh
git filter-branch -f --env-filter '
    oldemail="34401+cteachworth@users.noreply.github.com"
    newemail="334401+cteachworth@users.noreply.github.com
    [ "$GIT_AUTHOR_EMAIL"="$oldemail" ] && GIT_AUTHOR_EMAIL="$newemail"
    [ "$GIT_COMMITTER_EMAIL"="$oldemail" ] && GIT_COMMITTER_EMAIL="$newemail"
    ' HEAD
