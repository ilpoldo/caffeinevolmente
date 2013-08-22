Caps = new Meteor.Collection("caps");

if (Meteor.isClient) {
  Template.scoreboard.rated_caps = function () {
    return Caps.find({tasted: true}, {sort: {score: -1, name: 1}});
  };
  Template.scoreboard.new_caps = function () {
    return Caps.find({tasted: false}, {sort: {score: -1, name: 1}});
  };

}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Caps.find().count() === 0) {
      var names = ["Dolcemente - crema lungo",
                   "Deliziosamente",
                   "Magicamente - le selezioni",
                   "¡Tierra! - intenso",
                   "Appassionatamente",
                   "Intensamente",
                   "Divinamente - le selezioni"];
      for (var i = 0; i < names.length; i++)
        Caps.insert({name: names[i],
                     score: 0,
                     image: '/images/caps/' + (i+1) + '.png',
                     tasted: false});
    }
  });
}
