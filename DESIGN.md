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

### createCounter([data]) returns counterId
Create counter apply data to new counter document and return a UUID.

### count(counterId,  count, [data])
This updates a counter in the collection associated with the provided counterId. If data is provided, data gets saved on the counter count being saved.

### getCounter(counterId)
Gets all of the counter counts sorted by position with oldest first.

## Document
A counter is a collection of counter documents collated together with a unique id - counterId. 

In the database the data might look something like this.
```
{
    counterId: '1234',
    count: 0,
    position: 0,
    meta: {
        courseName: 'Seneca Creek Disc Golf Course',
        temperature: 56
    }
}

{
    counterId: '1234',
    count: 1,
    position: 1,
    meta: {
        hole: 1,
        tee: 'blue',
        basket: 'A',
        distance: 188,
        disc: 'Champion Roc 3'
    }
}

{
    counterId: '1234',
    count: 2,
    position: 2,
    meta: {
        hole: 1,
        tee: 'blue',
        basket: 'A',
        distance: 143,
        disc: 'Kratos'
    }
}


{
    counterId: '1234',
    count: 3,
    position: 3,
    meta: {
        hole: 1,
        tee: 'blue',
        basket: 'A',
        distance: 18,
        disc: 'Judge'
    }
}
```
Obviously, the meta data is whatever the application wants to persist for a given counter. In the above use case, what is saved here is the score for one player on hole 1 at a disc golf course called Seneca Creek Disc Golf Course. 

The first counter record is basically creating the counter with a count of 0. In the context of a disc golf scorecard, at this stage, a scorecard has been created but a disc has to yet to be thrown and recorded.

The position data point is used to keep track of the order in which counts are saved to the database. All of these database records will have createdAt and updatedAt fields, but I feel like a specific feild to track effectively order of counter counts is more accurate. It's possible that more than one count for a counter has the exact same createdAt, therefore ordering the counts by createdAt may not yeild the correct results.

