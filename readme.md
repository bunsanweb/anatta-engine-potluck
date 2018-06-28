# Potluck: Application Example with Anatta Engine

"Potluck" is a name of memo sharing system for URIs like reddit.
This project is an implementation of  the system with 
[anata-engine](https://github.com/bunsanweb/anatta-engine).

## Setup

```bash
$ git clone https://github.com/bunsanweb/anatta-engine-potluck.git
$ cd anatta-engine-potluck
$ npm install
```

## Start web server

```bash
$ npm start
```

Some environmental variables accepted as:

```bash
$ PORT=8080 ORB_URI='mongodb://localhost:27017/#potluck' npm start
```

The `ORB_URI` is switching backend storage, defined at:

- https://github.com/bunsanweb/anatta-engine/blob/master/engine/orb/core.js

## Application Architecture

The "potluck" is designed as CQRS and Event Sourcing architecture.
Each agent is independent with events from browser inputs: "comment to URI".

- src/post.html/js: spawn event from form inputs
- src/activities.html/js: an event queue subscribed from view agents
- src/index.html/js: top page view: list of commented URIs
- src/link.html/js: view of comments for each URI
- src/tag.html/js: view of URI link list for each tag
- src/author.html/js: view of URI link list for each author
- src/activityList.html/js: debug view for list of raw events

Each view agent builds their specialized HTML contents from raw events,
then stores to the `orb` cache.
Client access to the views is just returning the stored content.
