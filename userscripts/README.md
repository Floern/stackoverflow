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

<sup>Tested with Greasemonkey on Firefox</sup>

### Warning

If you have many (50+) accounts on Stack Exchange, try not to load the flag summary too often in a short timespan, you might get rate limited or soft-banned because the script makes too many requests.
