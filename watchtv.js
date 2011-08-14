/**
 * WatchTV plugin for showtime version 0.4  by facanferff (Fabio Canada / watchtv.showtime@hotmail.com)
 *
 *  Copyright (C) 2011 facanferff (Fabio Canada / watchtv.showtime@hotmail.com)
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function(plugin) {

  var PREFIX = "watchtv";
  var n_websites = 0;
  var websites = [];
  var names_websites = [];
  var tos = "WatchTV (referred hereafter as \"software\"), its author, partners, and associates do not condone piracy. \n"+
      "WatchTV is a hobby project, distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY, without even "+
      "the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\nThe software is intended solely for educational "+
      "and testing purposes, and while it may allow the user to watch free online video resources (available in different websites, "+
      "such as Youtube, GameTrailers and others), it is required that such user actions must comply with local, federal and country legislation.\n"+
      "Furthermore, the author of this software, its partners and associates shall assume NO responsibility, legal or otherwise implied, \n"+
      "for any misuse of, or for any loss that may occur while using WatchTV.\nYou are solely responsible for complying with the applicable laws "+
      "in your country and you must cease using this software should your actions during WatchTV operation lead to or may lead to infringement or "+
      "violation of the rights of the respective content copyright holders.\nWatchTV is not licensed, approved or endorsed by any online resource "+
      "proprietary. Do you accept this agreement?";

//settings 

  var service =
    plugin.createService("WatchTV", PREFIX + ":start", "tv", true,
			   plugin.path + "logo.png");
  
  var settings = plugin.createSettings("WatchTV",
					  plugin.path + "logo.png",
					 "WatchTV: TV channels online.");

  settings.createInfo("info",
			     plugin.path + "logo.png",
			     "WatchTV.\n\n"+
				 "Plugin developed by facanferff \n\n"+
                                 "(Fabio Canada / watchtv.showtime@hotmail.com)\n\n"+
                                 "GITHUB: http://github.com/facanferff");
  
  settings.createBool("tosaccepted", "Accepted TOS (available in opening the plugin):", false, function(v) {
    service.tosaccepted = v;
  });

  settings.createBool("explicit", "Enable Adult content", false, function(v) {
    service.explicit = v;
  });

  settings.createString("mainwebsite", "Website for genres.xml and country.xml: ", "", function(v) {
    service.mainwebsite = v;
  });
  
  settings.createString("website", "Websites for list-....xml: ", "", function(v) {
    service.website = v;
  });
  
  settings.createString("country", "Country (two letters): ", "", function(v) {
    service.country = v;
  });
  
  settings.createDivider("Development");
  
  settings.createBool("debug", "Enable Debugging", false, function(v) {
    service.debug = v;
  });
  
  settings.createInt("timeout", "Timeout (in seconds): ", 20, 1, 120, 1, "s", function(v) {
    service.timeout = v;
  });
  
function startPage(page) {
    if (!service.tosaccepted)
        if (showtime.message(tos, true, true))
            service.tosaccepted = 1;
        else
            return;
    
    n_websites = 0;
  
    var n = 0;
    for each (var website in (service.website).toString().split('\\./'))
    {
        names_websites[n] = website.toString().slice(0, website.toString().indexOf('::'));
        websites[n] = website.toString().slice(website.toString().indexOf('::') + 2, website.toString().length);
        n++;
        n_websites++;
    }
    
    page.appendItem(PREFIX + ':websites', "directory", {title: "Websites"});
    page.appendItem(PREFIX + ':genres:auto:auto', "directory", {title: "Genres"});
    page.appendItem((service.country == "")?PREFIX + ':country':PREFIX + ':genres:' + service.country + ':auto', 
        "directory", {title: (service.country == "")?"Country":service.country});
        
    page.type = "directory";
    page.contents = "items";
    page.loading = false;
    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV";
}
  
plugin.addURI(PREFIX + ":country", function(page) {
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV";
    
    var doc = new XML(showtime.httpGet(service.mainwebsite + "/country.xml").toString());
    
    for each (var country in doc.channel.item)
    {
        var metadata = {
            title: country.title,
            icon: country.thumbnail
        }
        
        page.appendItem(PREFIX + ":genres:" + country.link + ":auto", "video", metadata);
    }
});

plugin.addURI(PREFIX + ":genre:(.*):(.*):(.*)", function(page, genre, country, website) {
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV - " + genre;
    
    var id = 0;
    var doc;
    var current_link = 0;
    var title;
    var n_stream = 1;
    
    var n_invalid = -1;
    var invalid_channel = [];
    
        for (var n = 0; n < n_websites; n++)
        {
            if (website != "auto")
                n = website;
            try
            {
                doc = new XML(showtime.httpGet(websites[n] + "/list/list-" + genre + ".xml").toString());
                
                for each (var channel in doc.channel.item)
                {
                    for each (var rtmp1 in channel.link)
                    {
                        n_stream = current_link+1;
                        if (n_stream > 1)
                            title = channel.title + " (" + n_stream + ")";
                        else
                            title = channel.title;
                        if (channel.country == country || country == "auto")
                        {
                            var link = (channel.link[current_link].indexOf('rtmp') != -1)?channel.link[current_link] + " timeout=" + service.timeout:
                                channel.link[current_link];
                            if (service.debug == 1)
                            {
                                var ret = showtime.probe(channel.link[current_link] + " timeout=" + service.timeout);
                                if (!ret.result)
                                {
                                    page.appendItem(link, "video", {title: title, icon: channel.thumbnail});
                                }
                                else
                                {
                                    showtime.trace(channel.title + ": " + ret.errmsg);
                                    invalid_channel[n_invalid+1] = channel.title + ": " + ret.errmsg + "\n";
                                    n_invalid++;
                                }
                            }
                            else if (service.debug == 0)
                                page.appendItem(link, "video", {title: title, icon: channel.thumbnail});
                        }
                        current_link++;
                    }
                    id++;
                    current_link = 0;
                }
            }
            catch(err)
            {
                showtime.trace("Website n." + n + "; Error: " + err, true, false);
                continue;
            }
            if (website != "auto")
                break;
        }
        if (service.debug == 1 && n_invalid != -1)
            showtime.message(invalid_channel, true, false);
});

plugin.addURI(PREFIX + ":genres:(.*):(.*)", function(page, country, website) {
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV";
    
    page.appendItem(PREFIX + ':tvlist:' + country + ":" + website, "directory", {title: "All Channels"});
    
    var doc = new XML(showtime.httpGet(service.mainwebsite + "/genres.xml").toString());

        for each (var channel in doc.channel.item)
        {
            var metadata = {
                title: channel.title
            }
            if (channel.folder == 0 || channel.folder == undefined)
            {
                if (service.explicit == 1)
                    page.appendItem(PREFIX + ":genre:" + channel.link + ":" + country + ":" + website, "directory", metadata);
                else if (service.explicit != 1 && channel.filter == "0")
                    page.appendItem(PREFIX + ":genre:" + channel.link + ":" + country + ":" + website, "directory", metadata);
            }
            else
            {
                if (service.explicit == 1)
                    page.appendItem(PREFIX + ":genres:" + channel.link + ":" + country + ":" + website, "directory", metadata);
                else if (service.explicit != 1 && channel.filter == "0")
                    page.appendItem(PREFIX + ":genres:" + channel.link + ":" + country + ":" + website, "directory", metadata);
            }
        }
});

plugin.addURI(PREFIX + ":websites", function(page) {
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV";
    
    for (var n = 0, n1 = 1; n < n_websites; n++, n1++)
        page.appendItem(PREFIX + ":genres:" + "auto" + ":" + n, "directory", {title: names_websites[n]});
});

plugin.addURI(PREFIX + ":tvlist:(.*):(.*)", function(page, country, website) {
    page.type = "directory";
    page.contents = "items";
    page.loading = false;

    page.metadata.logo = plugin.path + "logo.png";
    page.metadata.title = "WatchTV";
    
    var id = 0;
    
    var doc = new XML(showtime.httpGet(service.mainwebsite + "/genres.xml").toString());
    
    var current_link;
    var title;
    
    var n_invalid = -1;
    var invalid_channel = [];
    
   for (var n = 0; n <= n_websites; n++)
    {
        if (website != "auto")
            n = website;
        try
        {
            for each (var genre in doc.channel.item)
            {
                try
                {
                    id = 0;
                    var list = new XML(showtime.httpGet(websites[n] + "/list/list-" + genre.link + ".xml").toString());
                    for each (var channel in list.channel.item)
                    {
                        current_link = 0;
                        
                        for each (var rtmp in channel.link)
                        {
                            var n_stream = current_link+1;
                            if (n_stream > 1)
                                title = channel.title + " (" + n_stream + ")";
                            else
                                title = channel.title;
                            if (channel.country == country || country == "auto")
                                if (genre.filter == "0" || service.explicit == 1)
                                {
                                    var link = (channel.link[current_link].indexOf('rtmp') != -1)?channel.link[current_link] + " timeout=" + service.timeout:
                                        channel.link[current_link];
                                    if ((service.debug == 1))
                                    {
                                        var ret = showtime.probe(channel.link[current_link] + " timeout=" + service.timeout);
                                        if (!ret.result)
                                        {
                                            page.appendItem(link, "video", {title: title, icon: channel.thumbnail});
                                        }
                                        else
                                        {
                                            showtime.trace(channel.title + ": " + ret.errmsg);
                                            invalid_channel[n_invalid+1] = channel.title + ": " + ret.errmsg + "\n";
                                            n_invalid++;
                                        }
                                    }
                                    else if (service.debug == 0)
                                        page.appendItem(link, "video", {title: title, icon: channel.thumbnail});
                                }
                            current_link++;
                        }
                        id++;
                        current_link = 0;
                    }
                }
                catch(err)
                {
                    continue;
                }
            }
        }
        catch(err)
        {
            showtime.trace("There was one error with website n." + n + ":\n" + err, true, false);
        }
        if (website != "auto")
            break;
    }
   
   if (service.debug == 1 && n_invalid != -1)
       showtime.message(invalid_channel, true, false);
});

plugin.addURI(PREFIX + ":start", startPage);
})(this);
