# additup
This is about counting - adding ones.

## Simple Use Case

Stephanie likes to play disc golf, and normally she can keep her score in her head, but sometimes, she loses track. All she really cares about is whether she's over or under par. If Stephanie bogeys a hole, she adds one to her score (counter). If she birdies a hole, Stephanie subtracts one from her score (counter). 

Stephanie's counter then starts at 0 - or even in disc golf lingo. As she plays holes, Stephanie increment or decrements her counter to reflect how far over or under even she is after each hole and at the end of the round.

## Complex Use Case

Like Stephanie, Melanie love to play disc golf too, but she's more into keep score than Stephanie. She want to know how she scores each and every hole, and she wants to know a bunch of stuff about each hole, and even each shot thrown. 

So rather than one counter that goes up and down per hole like Stepanie's scorecard, Melanie needs really a collection of counters, one for each hole. That means what Stephanie had for her entire round, will exist for each hole. In addition to having a counter for each hole, Melanie wants to track details about each hole and even individual shots. Meta data can be assigned to each hole to contain information like hole number, distance, par, tee (e.g. red, white, blue), basket placement (e.g. A, B, C). And Melanie wants to tie some meta data to each shot. A shot is an increment of a hole counter. So each new hole counter starts at 0, when Melanie moves the counter to 1, she has the option of adding more data to this shot. That could include distance of shot, disc thrown, forehand/backhand.

## Conclusion
While these use cases involve keeping track of disc golf scores, it seems as those these sorts of counters could be useful for lots of different things. That's why I decided to just create a Node package and open source it. This repo is the base package, I'll also demo the scorecard that I build as well, when I build it. 

I've been actually working on this side project for several years. I've wanted to build my own disc golf scorecard application for a couple of reasons. I don't like how the main app made by UDisc is stingy with the data that users put in the app. Users should have full control and access to their data that they entire into an application. I wanted to create a repo that I can share with job applications to showcase how I build stuff. 

If you've got ideas about this topic or repo, I would love to have some contributors. 
