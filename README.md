# additup
Add It Up is a really simple application. At its core, Add It Up is a counter. Or more precisely, a collection of counters.

I came up with this idea when I wanted to build an application to track my scores playing disc golf. Disc golf works like regular golf, you play holes and you record the number of strokes it takes to get the disc in the basket. So if you play hole 1 and get you do it in 3 strokes, you mark on your scoresheet 3 for hole 1. Hole 2, you might get a 4, and Hole 3 a 5.

Obviously, I could build an application that lets me persist data that shows hole 1 is a 3, hole 2 is a 4 and hole 3 I got a 5. I thought it would be more interesting if instead of just recording numbers, I treated each hole like a counter. So I can count each stroke. So to score a round of disc golf, I needed a collection of counters, with each hole being a counter.

And then I thought, each increment of a counter can have meta data tied to it. In the example of a disc golf shot, I might want to know which disc I threw, how far it went, the lat and long. Meta data could apply to the round itself, such as the course information, perhaps weather data. So every disc golf scorecard is a collection of counters with meta data tied to the counters, the counter increments and the overall collection. 

So I created this Add It Up application. I made some strong decisions when building this application, mainly, it only works with MongoDB. I store all of the data in MongoDB because I think it works perfectly for this problem. But having said that, I would love it if Add It Up worked with other data storage systems, so please feel free to contribute to this project.

# Objects

Here's how the objects look and are connected.

The collections are called Counters and the counters are called Counter, which include increments. So you have a Counters object that has many Counter objects associated with it. which include Increment objects.
```
Counters {
  meta: {...}
  counters: [

    meta: { ... }
    
]
}

```
