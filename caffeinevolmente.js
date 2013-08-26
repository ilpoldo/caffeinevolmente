Caps = new Meteor.Collection("caps");

if (Meteor.isClient) {
  Template.scoreboard.rendered = function () {
    var list = document.getElementById("user-ratings");
    nativesortable(list, {
      change: function (argument) {
        console.log("foo");
      }
    });
  };

  Template.scoreboard.caps = function () {
    var user = Meteor.user();
    if (!user)
      return [];
    // TODO: Too many queries?!
    var caps = user.profile.favourites.map(function (cap_id) {
      return Caps.findOne({_id: cap_id})
    });
    return caps;
  };
  Template.scoreboard.events({

  //   'dragover #features' : function(e, t) {
  //     e.preventDefault(); 
  //     $(e.currentTarget).addClass('dragover');
  //   },

  //   'dragleave #features' : function(e, t) {
  //     $(e.currentTarget).removeClass('dragover');
  //   },

    'drop' : function(e, t) {
      // e.preventDefault();
      var caps = t.findAll('.cap').map(Spark.getDataContext)

      var new_favourites = _.map(caps, function (cap) {
        return cap._id;
      });
      
      Meteor.users.update({_id:Meteor.user()._id},
                          {$set:
                            {"profile.favourites":
                              new_favourites
                            }
                          });
    }

  });

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

  
  Accounts.validateNewUser(function (user) {
    if ( _.contains(allowed_users, user.emails[0].address) )
      return true;
    throw new Meteor.Error(403, "Your email is not allowed");
  });

  Accounts.onCreateUser(function(options, user) {
    var all_the_caps = Caps.find({}, {sort: {name: 1}}).map(function (c) {
      return c._id;
    });
    user.profile = {favourites: all_the_caps};

    // We still want the default hook's 'profile' behavior.
    // if (options.profile)
    //   user.profile = options.profile;
    return user;
  });
}
