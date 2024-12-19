# additup Design

I built additup on top of MongoDB. It's an opinionated decision and this package could really work with any document database, I just happen to like MongoDB and their free tier is really good enough for a lot of small projects. I would be totally happy if someone wanted to update the code to database agnostic and contribute to this project.

In MongoDB there is a counters collection. In the counters collection are the counter documents. 

```
Counter {
    _id: ObjectId('6577b2c5d9ba942e85d6b0c4')
    count: 2,
    createdAt: '2024-12-18T00:15:49.992+00:00',
    updatedAt: '2024-12-18T00:15:52.231+00:00',
    collatorId: '066C2B81-8859-4922-90A1-BA197B3F20DC',
    position: 0,
    meta: [{
      course: 'Seneca Creek',
      city: 'Gaithersburg',
      weather: 'rain'
    },
    {
      hole: 1,
      distance: 234,
      tee: "blue",
      basket: "A"
    }]
}
```

Then in the application, if you're building something like a disc golf scoring application and you want to track scores for each hole in a round, you would create multiple counters - one for each hole. The key piece of data to make this work is the collatorId and position. The collatorId is a UUID that the application creates and assigns to counter objects. The position is also created by the application. It must be a unique number for the provided collatorId. Position doesn't need to indicate sort or priority within the collection of counters, but it could, it depends on the application. The collatorId and position are the two key data points necessary to retrieve a specific counter from a collection.

But even if you're creating only a simple single counter, your application must still provide a collatorId and position because it is how you will retrieve all counters. 

## API
The API consists of a couple of basically CRUD functions.

### createCounter(counterId, [data])
Create counter using the application provided counterId. Creating multiple counters with the same counterId, groups them together as a collection of counters. If data is provided, it gets saved on the counter as meta data.

### updateCounter(counterId, position, count, [data])
This updates a counter in the collection associated with the provided counterId at the provided position with the new count value. If data is provided, gets saved on the counter 

### getCounter(counterId, position)
Get a specific counter using counterId and position, returns a counter document.

### getCounters(counterId)
Gets all of the counters with that counterId. Returns an array of counter documents.

## History

I've been working on this problem on the side for several years. I've written at least two applications to solve this seemingly simple problem, but none of my solutions ever felt right. 

I believe this is actually a super simple problem to solve and the solution should be simple. So far, this is the simplest solution I can concoct and still be solving a problem. It's really just some basic document management using an ID that groups documents together create a relationship between counters. If I didn't have the collatorId, it would be up to the application to maintain that relationship and I just don't think that's a good way to go. It would end up with a bunch of basically orphaned counter documents that are largely useless if the application loses the collation data. While MongoDB is not a relational database, collating documents using an ID seems appropriate.
