'use strict';

(function () {
    angular.module('iTableTree').directive('iTableTreeColumnTemplate', function () {
        return {
            restrict: 'E',
            scope: {
                template: '&'
            },
            link: function (scope, element) {
                element.replaceWith($compile(angular.element(scope.template()))(scope.$parent));
            }
        };
    });
})();