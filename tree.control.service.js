'use strict';

(function () {
    angular.module('iTableTree').factory('TreeControlService', ['$window', function ($window) {
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

        TreeControlService.prototype.clearAllSelection = function ($event, branch) {
            var $scope = this.$scope;
            angular.forEach($scope.selectedBranches, function (b) {
                if (b) {
                    b.selected = false;
                }
            });
            $scope.selectedBranches = {};
            if ($scope.beforeShiftKey()) {
                ($scope.beforeShiftKey())($event, branch, $scope.lastClickedBranch);
            }
        };


        //-----------------------------------------------------
        /**
         * TODO
         */
        TreeControlService.prototype.selectBranch = function (branch, data) {
            if (!branch || branch['disabled'] || scope.options['disableSelection']) {
                return;
            }

            if (!data) {
                data = {'isMultiple': false};
            }

            //expandAllParents(branch);
            if (data['isMultiple']) {
                branch['selected'] = !branch['selected'];
                if (!branch['selected']) {
                    scope.selectedBranches[branch['uid']] = null;
                } else {
                    scope.selectedBranches[branch['uid']] = branch;
                }
            } else {
                _.each(scope.selectedBranches, function (b) {
                    if (b) {
                        b['selected'] = false;
                    }
                });
                scope.selectedBranches = {};
                branch['selected'] = true;
                scope.selectedBranches[branch['uid']] = branch;
            }

            if (branch['onSelect'] !== undefined) {
                return $timeout(function () {
                    return branch['onSelect'](branch, data);
                });
            } else if (!data['silentSelect']) {
                if (scope.onSelect() !== undefined) {
                    return $timeout(function () {
                        return (scope.onSelect())(branch, data);
                    });
                }
            }
        };

        TreeControlService.prototype.userClicksBranch = function ($event, branch, data) {
            var $scope = this.$scope;

            if (!branch) {
                return;
            }

            if ($event.stopPropagation) {
                $event.stopPropagation();
            }

            var isMultiple = $scope.multiSelect;

            //Firefox: 224
            //Opera: 17
            //WebKit (Safari/Chrome): 91 (Left Apple) or 93 (Right Apple)
            var userAgent = $window.navigator.userAgent.toLowerCase();
            var isMac = $window.navigator && $window.navigator.platform.toLowerCase().indexOf('mac') >= 0;
            var isFirefox = userAgent.indexOf('firefox') > -1;
            var isOpera = userAgent.indexOf('opera') > -1;
            var isWebKit = userAgent.indexOf('safari') > -1 || userAgent.indexOf('chrome') > -1;

            if ($event.ctrlKey || (isMac && ($scope.keyCode === 224 && isFirefox) || ($scope.keyCode === 17 && isOpera) ||
                (($scope.keyCode === 91 || $scope.keyCode === 93) && isWebKit))) {
                isMultiple = $scope.allowMultiple;
            }
            if ($event.shiftKey) {
                isMultiple = $scope.allowMultiple;
            } else {
                //record last selected item, use pageY to determine if up or down
                branch.pageY = $event.pageY;
                $scope.lastClickedBranch = branch;
            }

            data = data ? data : {};
            data.isMultiple = data.isMultiple !== undefined ? data.isMultiple : isMultiple;

            if ($event.shiftKey) {
                if (!$scope.lastClickedBranch) {
                    $scope.lastClickedBranch = this.getFirstBranch();
                    $scope.lastClickedBranch.pageY = -1;
                }
                if ($scope.lastClickedBranch) {
                    var nextBranch = $event.pageY < $scope.lastClickedBranch.pageY ? this.getPrevBranch : this.getNextBranch;
                    var b = nextBranch($scope.lastClickedBranch);
                    if ($scope.lastClickedBranch.uid === branch.uid) {
                        this.clearAllSelection($event, branch);
                        selectBranch(branch, data);
                    } else if (b) {
                        this.clearAllSelection($event, branch);
                        //select anchor
                        if (!$scope.lastClickedBranch['selected']) {
                            selectBranch(scope.lastClickedBranch, data);
                        }
                        while (b && b['uid'] !== branch['uid']) {
                            selectBranch(b, data);
                            b = nextBranch(b);
                        }
                        //select target
                        if (!branch['selected']) {
                            selectBranch(branch, data);
                        }
                    }
                    if ($scope.afterShiftKey()) {
                        ($scope.afterShiftKey())($event, branch, $scope.lastClickedBranch);
                    }
                }
            } else {
                return selectBranch(branch, data);
            }
        };

        return TreeControlService;
    }]);
})();