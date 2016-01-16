'use strict';

(function () {
    angular.module('iTableTree').factory('TreeControlService', TreeControlService);

    function TreeControlService ($scope) {
        this.$scope = $scope;
    }

    TreeControlService.prototype.isSelectedAll = function () {
        var $scope = this.$scope;

        for (var i = 0; i < $scope.treeRows.length; i++) {
            if (!$scope.treeRows[i].branch.selected) {
                return false;
            }
        }
        return true;
    };

    return TreeControlService;

})();