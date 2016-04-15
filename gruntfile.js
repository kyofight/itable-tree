'use strict';

var _ = require('lodash');

module.exports = function (grunt) {
    var appConfig = grunt.file.readJSON('config.json');

    grunt.initConfig({

    });

    grunt.loadNpmTasks('grunt-closure-compiler-cwd-only');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-express-server');
    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-string-replace');

    grunt.registerTask('bind-languages', 'create a single file that contains all the translations', function () {
        bindTranslations.compile('client/eConstruct/i18n', 'build/client/eConstruct/i18n/', this.async());
    });

    grunt.registerTask('default', [
        'jshint',
        'closure-compiler:client',
        'closure-compiler:admin',
        'copy:econstruct-js',
        'copy:econstruct-admin-js',
        'jasmine_node',
        'express:dev',
        'watch'
    ]);
};