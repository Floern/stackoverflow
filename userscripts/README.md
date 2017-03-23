# Userscripts

## Stack Exchange Global Flag Summary

Provides a network wide flag summary for all Stack Exchange sites.

If you are logged into the Stack Exchange network, you can visit [your Stack Exchange profile](http://stackexchange.com/users/current?tab=flags), where you can find a new *flags* tab. It scans all per-site flag summaries and lists them in one table.

[![segfs screenshot](../resources/screens/segfs.png?raw=true)](../resources/screens/segfs.png?raw=true)

### How does it work?

The script scans [your network profile](http://stackexchange.com/users/current) for all Stack Exchange accounts you created. For each account it tries to access the flag summary page. Since that page is private, i.e. only visible to you (and mods), you need be logged in. From there it extracts the flag summary of the individual site and sums it all up in a generated table.

The table can be sorted asc & desc by clicking on the desired column label.

All per-site flag summary pages contain a link to the global flag summary.

### Install

[view source](SE_global_flag_summary.user.js) | [direct link (install)](SE_global_flag_summary.user.js?raw=true)

### Warning

If you have many (50+) accounts on Stack Exchange, try not to load the flag summary too often in a short timespan, you might get rate limited or soft-banned because the script makes too many requests.


## Flag Tracker

When you flag a post, this userscript will let you monitor that post and notify you in case the post gets edited.

If a post you flagged has been edited, you will be pinged by [@GenericBot](http://stackoverflow.com/users/7481043/generic-bot) in the [SoBotics chat room](http://chat.stackoverflow.com/rooms/111347/sobotics). Make sure you're pingable in this chat room to receive the notifications.

[![flag tracker report screenshot](../resources/screens/ftgenreport.png?raw=true)](../resources/screens/ftgenreport.png?raw=true)

### Install

[view source](flagtracker.user.js) | [direct link (install)](flagtracker.user.js?raw=true)
