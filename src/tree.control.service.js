'use strict';

(function () {
    angular.module('iTableTree').factory('TreeControlService', ['$window', 'TreeGeneralService', 'UtilService', function ($window, TreeGeneralService, UtilService) {
        var userAgent = $window.navigator.userAgent.toLowerCase();
        var isMac = $window.navigator && $window.navigator.platform.toLowerCase().indexOf('mac') >= 0;
        var isFirefox = userAgent.indexOf('firefox') > -1;
        var isOpera = userAgent.indexOf('opera') > -1;
        var isWebKit = userAgent.indexOf('safari') > -1 || userAgent.indexOf('chrome') > -1;

        function TreeControlService($scope) {
            this.$scope = $scope;
        }

        TreeControlService.prototype.isSelectedAll = function () {
            var notSelected = false;
            this.forEachBranch(function (branch) {
                if (!branch._selected && branch._visible_) {
                    notSelected = false;
                }
                return notSelected;
            });
            return notSelected;
        };

        TreeControlService.prototype.toggleAllSelection = function (branch, isSelected) {
            var $scope = this.$scope;

            if (branch) {
                if ($scope.selectedBranches[branch._uid]) {
                    $scope.selectedBranches[branch._uid]._selected = isSelected;
                    if (isSelected) {
                        $scope.selectedBranches[branch._uid]._selected = true;
                    } else {
                        delete $scope.selectedBranches[branch._uid];
                    }
                }

                angular.forEach(branch[$scope.options.itemsLabel], function (branch) {
                    if ($scope.selectedBranches[branch._uid]) {
                        $scope.selectedBranches[branch._uid]._selected = isSelected;
                        if (isSelected) {
                            $scope.selectedBranches[branch._uid]._selected = true;
                        } else {
                            delete $scope.selectedBranches[branch._uid];
                        }
                    }
                })
            } else {
                angular.forEach($scope.selectedBranches, function (branch) {
                    if (branch) {
                        branch._selected = isSelected;
                        if (isSelected) {
                            $scope.selectedBranches[branch._uid]._selected = true;
                        }
                    }
                });

                //todo: before filter, clear all selected branches
                $scope.selectedBranches = {};
            }
        };

        TreeControlService.prototype._selectBranch = function (branch, data) {
            var $scope = this.$scope;
            if (!branch || branch._disabled || $scope.options.disableSelection) {
                return;
            }

            if (!data) {
                data = {'isMultiple': false};
            }

            if (data.isMultiple) {
                branch._selected = !branch._selected;
                if (!branch._selected && $scope.selectedBranches[branch._uid]) {
                    delete $scope.selectedBranches[branch._uid];
                } else {
                    $scope.selectedBranches[branch._uid] = branch;
                }
            } else {
                this.toggleAllSelection();
                branch._selected = true;
                $scope.selectedBranches[branch._uid] = branch;
            }

            if (angular.isFunction($scope.options.callbacks.onSelectBranch)) {
                $scope.options.callbacks.onSelectBranch(branch, data);
            }
        };

        TreeControlService.prototype.selectBranch = function ($event, branch, data) {
            var $scope = this.$scope;

            if (!branch) {
                return;
            }

            if ($event.stopPropagation) {
                $event.stopPropagation();
            }

            var isMultiple = $scope.options.multiSelect;

            //Firefox: 224
            //Opera: 17
            //WebKit (Safari/Chrome): 91 (Left Apple) or 93 (Right Apple)
            if ($event.ctrlKey || (isMac && (($scope.keyCode === 224 && isFirefox) || ($scope.keyCode === 17 && isOpera) ||
                (($scope.keyCode === 91 || $scope.keyCode === 93) && isWebKit)))) {
                isMultiple = $scope.options.allowMultiple;
            }
            if ($event.shiftKey) {
                isMultiple = $scope.options.allowMultiple;
            } else {
                //record last selected item, use pageY to determine if up or down
                branch._pageY = $event.pageY;
                $scope.lastSelectedBranch = branch;
            }

            data = data ? data : {};
            data.isMultiple = data.isMultiple !== undefined ? data.isMultiple : isMultiple;

            if ($event.shiftKey) {
                if (!$scope.lastSelectedBranch) {
                    $scope.lastSelectedBranch = branch;
                    return;
                }

                var nextBranchCall = $event.pageY < $scope.lastSelectedBranch._pageY ? 'getPrevBranch' : 'getNextBranch';
                var b = branch[nextBranchCall]();
                if ($scope.lastSelectedBranch._uid === branch._uid) {
                    this.toggleAllSelection(branch);
                    this._selectBranch(branch, data);
                } else if (b) {
                    this.toggleAllSelection(branch);
                    //select anchor
                    if (!$scope.lastSelectedBranch._selected) {
                        this._selectBranch($scope.lastSelectedBranch, data);
                    }
                    while (b && b._uid !== branch._uid) {
                        this._selectBranch(b, data);
                        b = b[nextBranchCall]();
                    }
                    //select target
                    if (!branch._selected) {
                        this._selectBranch(branch, data);
                    }
                }
            } else {
                this._selectBranch(branch, data);
            }
        };

        TreeControlService.prototype.toggleCheckboxes = function ($event) {
            var $scope = this.$scope;
            var self = this;
            var action = $event.target.checked;
            //todo: add partial select status, if it is partial selected, then toggle to select all?
            angular.forEach($scope.treeData, function (branch) {
                if (branch._selected !== action) {
                    self.selectBranch({}, branch, {isMultiple: true});
                }
            });
        };

        TreeControlService.prototype.saveTreeState = function ($event, branch) {
            //save expanded, selected nodes based on unique model key

            //also save filter? should be user do that

        };

        TreeControlService.prototype.toggleExpansion = function (branch, flag) {
            branch._expanded = typeof flag === 'undefined' ? !branch._expanded : flag;
            TreeGeneralService.forEachChild(branch, function (c, p) {
                c._visible_ = p._visible_ && p._expanded && branch._expanded && c._visible;
            });
        };

        return TreeControlService;
    }]);
})();