/*
 After you have changed the settings at "Your code goes here",
 run this with one of these options:
  "grunt" alone creates a new, completed images directory
  "grunt clean" removes the images directory
  "grunt responsive_images" re-processes images without removing the old ones
*/

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    responsive_images: {
      dev: {
        options: {
          engine: 'im',
          sizes: [
            {
              width: 615, //viewport width 800px
              suffix: "_large",
              quality: 80
            },
            {
              width: 461, //viewport width 600px
              suffix: "_medium",
              quality: 80
            },
            {
              width: 318, //viewport width 414px
              suffix: "_small",
              quality: 80
            }
          ]
        },
        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'img/',
          dest: 'images/'
        }]
      }
    },
    clean: {
      dev: {
        src: ['images'],
      },
    },
    mkdir: {
      dev: {
        options: {
          create: ['images']
        },
      },
    },
    copy: {
      dev: {
        files: [{
          expand: true,
          src: 'images_src/fixed/*.{gif,jpg,png}',
          dest: 'images/'
        }]
      },
    },

    /* Package together CommonJS-style code for use in the browser */
    browserify: {
      standalone: {
        src: [ '<%= pkg.name %>.js', './node_modules/idb/lib/idb.js', 'js/*.js' ],
        dest: './browser/dist/restaurant-bundle.js',
        options: {
          browserifyOptions: {
            standalone: '<%= pkg.name %>'
          },
          //transform: [["babelify", { "presets": ["es2015"] }]],
        }
      },
    },
  });

  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.registerTask('default', [
    'clean',
    'mkdir',
    'copy',
    'responsive_images',
    'browserify'
  ]);

};
