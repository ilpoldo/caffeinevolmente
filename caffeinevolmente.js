Caps = new Meteor.Collection("caps");
Migrations = new Meteor.Collection('migrations');


if (Meteor.isClient) {

  try{Typekit.load();}catch(e){}


  Template.scoreboard.rendered = function () {
    var list = document.getElementById("user-ratings");
    if (list) {
      nativesortable(list, {
        change: function (argument) {
          // FIXME
        }
      });
    }
  };

  Template.scoreboard.caps = function () {
    var user = Meteor.user();
    if (user) {
      return favourites(user);
    } else {
      return [];
    }
  };

  Template.scoreboard.events({
    'drop' : function(e, t) {
      // e.preventDefault();
      var caps = t.findAll('.cap').map(Spark.getDataContext);

      var new_favourites = _.map(caps, function (cap) {
        return cap._id;
      });
      
      Meteor.users.update({_id:Meteor.user()._id},
                          {$set:
                            {"profile.favourites":
                              new_favourites
                            }
                          });

      console.log(t);
    },
  });

  var taste_distance = function(friend) {
    var favourites = Meteor.user().profile.favourites;
    var square_distances = [];
    for (var i in favourites) {
      var cap_id = favourites[i];
      var other_rating = friend.profile.favourites.indexOf(cap_id);
      if (other_rating !== -1) {
        var rating = favourites.indexOf(cap_id);
        var square_of_distance = Math.pow((rating - other_rating), 2);
        square_distances.push(square_of_distance);
      }
    }
    return 1.0 / (1.0 + Math.sqrt(_.reduce(square_distances, function(sum, d){ return sum + d; })));
  };

  Template.detail.selected_cap = function() {
    return Session.get("selected_cap");
  };

  Template.social.friends = function() {
    if (Meteor.user()) {
      // TODO: sort by latest updated
      var friends = Meteor.users.find({_id: {$ne: Meteor.user()._id}}).fetch();
      return _.sortBy(friends, function(f) {return taste_distance(f);}).reverse();
    } else {
      return Meteor.users.find({});
    }
  };

  Template.friend.helpers(
  {
    name: function() {return this.profile.name;}
  });

  Template.cap.helpers(
  {
    tierra_tag: function() {return this.shorthand === 'ti';},
    dolcemente_slice: function() {return this.shorthand === 'dl';},
    le_selezioni: function() {return ["mm", "dv"].indexOf(this.shorthand) != -1;},
    selected: function() {
      var selected = Session.get("selected_cap");
      if (!selected) {
        return null;
      } else {
        return selected._id === this._id ? 'selected' : 'non-selected';
      }
    }
  });

  Template.cap.events({
    'click': function () {
      var selected = Session.get("selected_cap");
      if (selected) {
        Session.set("selected_cap", this._id === selected._id ? null : this);
      } else {
        Session.set("selected_cap", this);
      }
    }
  });


  Template.friend.caps = function() {
    return favourites(this);
  };

  favourites = function(user) {
    var favourites = user.profile.favourites;
    var caps = Caps.find({_id: {$in: favourites}}).fetch();

    return _.sortBy(caps, function(c) {
      return favourites.indexOf(c._id);
    });
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
    if (!Migrations.findOne({name: "addColorsAndFixNames"})) {
        var renames = {
          "Appassionatamente": "Divinamente - le selezioni",
          "Divinamente - le selezioni": "Appassionatamente",       
        }
      Caps.find({name: {$in: Object.keys(renames)}}).forEach(function (cap) {
        // swap Two badly named caps
        Caps.update(cap._id, {$set: {name: renames[cap.name]}});
      });
      var colors = {
        "Dolcemente - crema lungo": "#ac5c03",
        "Deliziosamente": "#e6b700",
        "Magicamente - le selezioni": "#bb0286",
        "¡Tierra! - intenso": "#81001f",
        "Appassionatamente": "#dc291e",
        "Intensamente": "#a00c2c",
        "Divinamente - le selezioni": "#281e86"
      };
      var shorthands = {
        "Dolcemente - crema lungo": "dl",
        "Deliziosamente": "dz",
        "Magicamente - le selezioni": "mm",
        "¡Tierra! - intenso": "ti",
        "Appassionatamente": "ap",
        "Intensamente": "in",
        "Divinamente - le selezioni": "dv"
      };
      Caps.find().forEach(function (cap) {
        Caps.update(cap._id, {$set: {color: colors[cap.name], shorthand: shorthands[cap.name]}});
      });
      Migrations.insert({name: "addFullName"});
    }
  });
  
  Accounts.validateNewUser(function (user) {
    if ( _.contains(Meteor.settings.allowed_users, user.emails[0].address) )
      return true;
    throw new Meteor.Error(403, "Your email is not allowed");
  });

  Accounts.onCreateUser(function(options, user) {
    var all_the_caps = Caps.find({}, {sort: {name: 1}}).map(function (c) {
      return c._id;
    });
    user.profile = {favourites: all_the_caps,
                    name: user.emails[0].address.slice(0,-9)};

    // We still want the default hook's 'profile' behavior.
    // if (options.profile)
    //   user.profile = options.profile;
    return user;
  });

  var taste_distance = function(user) {
    var reduce = function(key, values) {
      return Array.sum(values);  // Array.sum is in the mongodb docs 
    };

    var finalize = function(key, values) {
      return 1.0 / (1.0 + Math.sqrt(values));
    };

    var map = function() {
      for (var cap_id in user.profile.favourites) {
        var other_rating = this.profile.preferences.indexOf(cap_id);
        if (other_rating !== -1) {
          var rating = user.profile.favourites.indexOf(cap_id);
          var square_of_distance = Math.pow((rating - other_rating), 2);
          emit(this._id, square_of_distance);
        }
      }
    };

    return function(collection) {
      return collection.mapReduce(map,
                           reduce,
                           {query: {_id: {$ne: user._id}}});
    };

  };
}
