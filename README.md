# Starship Launch Twitter Bot

[![](https://img.shields.io/static/v1?style=social&label=Sponsor&message=%E2%9D%A4&logo=GitHub&color&link=%3Curl%3E)](https://github.com/sponsors/hediet)
[![](https://img.shields.io/static/v1?style=social&label=Donate&message=%E2%9D%A4&logo=Paypal&color&link=%3Curl%3E)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZP5F38L4C88UY&source=url)
[![](https://img.shields.io/twitter/follow/hediet_dev.svg?style=social)](https://twitter.com/intent/follow?screen_name=hediet_dev)

## Get notified about 30 minutes before a Starship launches by following this bot on Twitter:

[![](https://img.shields.io/twitter/follow/starship_alarm.svg?style=social)](https://twitter.com/intent/follow?screen_name=starship_alarm)

## About

Whenever a twitter account that this bot is following mentions `#StarshipLaunchIn30min`, this bot will retweet.

However, the bot will not retweet more than one tweet per 45 minutes.
The bot will only follow trustworthy accounts that don't misuse the retweet mechanism of this bot.
So it is **safe to enable push notifications for this twitter account** ([@starship_alarm](https://twitter.com/intent/follow?screen_name=starship_alarm))!

## Retweet Conditions

-   The tweeter must be followed by this bot
-   The tweeter must mention one of the following terms:
    -   `#StarshipLaunchIn30min` (prefer this one)
    -   `@starship_alarm`
    -   `#StarshipLaunchIn25min`
    -   `#StarshipLaunchIn20min`
    -   `#StarshipLaunchIn15min`
    -   `#StarshipLaunchIn10min`
    -   `#StarshipLaunchIn5min`
-   The bot must not have posted something 45 minutes earlier
-   The tweet to retweet must not be a retweet
-   The bot must find the tweet after 30 minutes (e.g. in case the bot or Twitter is offline for a couple of minutes)

## Twitter Delay

Note that Twitter push notifications might have a delay (I noticed a delay of up to 10 minutes).

## Deployment

Every commit pushed to master is automatically deployed on digitalocean.com.
