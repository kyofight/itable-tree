'use strict';

(function () {
    angular.module('iTableTreeDemo').config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('home');

        $stateProvider
            .state('home', {
                url: ''
            })
    });
})();




