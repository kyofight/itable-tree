'use strict';

(function () {
    angular.module('iTableTree').factory('TreeControlService', ['$window', function ($window) {
        var userAgent = $window.navigator.userAgent.toLowerCase();
        var isMac = $window.navigator && $window.navigator.platform.toLowerCase().indexOf('mac') >= 0;
        var isFirefox = userAgent.indexOf('firefox') > -1;
        var isOpera = userAgent.indexOf('opera') > -1;
        var isWebKit = userAgent.indexOf('safari') > -1 || userAgent.indexOf('chrome') > -1;

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
            if ($scope.callbacks.beforeShiftKey) {
                $scope.callbacks.beforeShiftKey($event, branch, $scope.lastSelectedBranch);
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

            //expandAllParents(branch);
            if (data['isMultiple']) {
                branch['selected'] = !branch['selected'];
                if (!branch['selected']) {
                    $scope.selectedBranches[branch['uid']] = null;
                } else {
                    $scope.selectedBranches[branch['uid']] = branch;
                }
            } else {
                _.each($scope.selectedBranches, function (b) {
                    if (b) {
                        b['selected'] = false;
                    }
                });
                $scope.selectedBranches = {};
                branch['selected'] = true;
                $scope.selectedBranches[branch['uid']] = branch;
            }

            if (branch['onSelect'] !== undefined) {
                return $timeout(function () {
                    return branch['onSelect'](branch, data);
                });
            } else if (!data['silentSelect']) {
                if ($scope.onSelect() !== undefined) {
                    return $timeout(function () {
                        return ($scope.onSelect())(branch, data);
                    });
                }
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

            var isMultiple = $scope.multiSelect;

            //Firefox: 224
            //Opera: 17
            //WebKit (Safari/Chrome): 91 (Left Apple) or 93 (Right Apple)
            if ($event.ctrlKey || (isMac && ($scope.keyCode === 224 && isFirefox) || ($scope.keyCode === 17 && isOpera) ||
                (($scope.keyCode === 91 || $scope.keyCode === 93) && isWebKit))) {
                isMultiple = $scope.allowMultiple;
            }
            if ($event.shiftKey) {
                isMultiple = $scope.allowMultiple;
            } else {
                //record last selected item, use pageY to determine if up or down
                branch.pageY = $event.pageY;
                $scope.lastSelectedBranch = branch;
            }

            data = data ? data : {};
            data.isMultiple = data.isMultiple !== undefined ? data.isMultiple : isMultiple;

            if ($event.shiftKey) {
                if (!$scope.lastSelectedBranch) {
                    $scope.lastSelectedBranch = this.getFirstBranch();
                    $scope.lastSelectedBranch.pageY = -1;
                }
                if ($scope.lastSelectedBranch) {
                    var nextBranch = $event.pageY < $scope.lastSelectedBranch.pageY ? this.getPrevBranch : this.getNextBranch;
                    var b = nextBranch($scope.lastSelectedBranch);
                    if ($scope.lastSelectedBranch.uid === branch.uid) {
                        this.clearAllSelection($event, branch);
                        this._selectBranch(branch, data);
                    } else if (b) {
                        this.clearAllSelection($event, branch);
                        //select anchor
                        if (!$scope.lastSelectedBranch.selected) {
                            this._selectBranch($scope.lastSelectedBranch, data);
                        }
                        while (b && b.uid !== branch.uid) {
                            this._selectBranch(b, data);
                            b = nextBranch(b);
                        }
                        //select target
                        if (!branch.selected) {
                            this._selectBranch(branch, data);
                        }
                    }
                    if ($scope.callbacks.afterShiftKey) {
                        $scope.callbacks.afterShiftKey($event, branch, $scope.lastSelectedBranch);
                    }
                }
            } else {
                return this._selectBranch(branch, data);
            }
        };

        /**
         * TODO: stop here, dinner time
         */
        TreeControlService.prototype.addBranchExternal = function (newBranch, sortKey, reverseOrder) {
            var folderIndex = 0;
            var foundNode = null;

            var findParentNode = function (nodes, i) {
                _.any(nodes, function (node) {
                    if (node['isFolder'] && (folderArr[i] === node['name'] || folderArr[i] === node['text'])) {
                        foundNode = node;
                        folderIndex++;
                        if (folderArr[folderIndex] === undefined) {
                            return true;
                        } else if (node[itemsLabel] && node[itemsLabel].length) {
                            findParentNode(node[itemsLabel], folderIndex);
                        }
                    }
                });
            };

            var folderArr = FolderService.formFolderArray(newBranch['folder'] || (newBranch['model'] && newBranch['model']['folder'] ? newBranch['model']['folder'] : ''));
            var newNode = newBranch['model'] ? newBranch : {
                'text': newBranch['name'] || newBranch['text'],
                'isFolder': false,
                'expanded': true,
                'model': newBranch
            };

            if (!folderArr || !folderArr.length) {
                scope.treeData.push(newNode);
                FolderService.sortList(scope.treeData, sortKey, reverseOrder);
            } else {
                findParentNode(scope.treeData, folderIndex);
                if (foundNode) {
                    tree.expandAllParents(foundNode);
                    var n = foundNode;
                    while (folderIndex < folderArr.length) {
                        var folderObject = {
                            'text': folderArr[folderIndex],
                            'isFolder': true,
                            'expanded': true,
                            'model': {}
                        };
                        folderObject[itemsLabel] = [];
                        n[itemsLabel].push(folderObject);
                        n = folderObject;
                        folderIndex++;
                    }
                    n[itemsLabel].push(newNode);
                    FolderService.sortList(foundNode[itemsLabel], sortKey, reverseOrder);
                } else {
                    //no parent found, form new branch
                    var newList = FolderService.buildTreeFromList([newNode]);
                    scope.treeData.push(newList[0]);
                    FolderService.sortList(scope.treeData, sortKey, reverseOrder);
                }
            }


            trackUpdate();
        };
        /** @expose
         * @param {Object} branch
         * @param {Object} newModel
         * @param {string=} sortKey
         * @param {boolean=} reverseOrder
         **/
        TreeControlService.prototype.addSubBranchExternal = function (branch, newModel, sortKey, reverseOrder) {
            var newNode = newModel['model'] ? newModel : {
                'text': newModel['name'] || newModel['text'],
                'isFolder': false,
                'expanded': true,
                'model': newModel,
                'selected': branch['selected'],
                'visible_': true
            };
            tree.expandAllParents(branch);
            if (!branch[itemsLabel]) {
                branch[itemsLabel] = [];
            }
            branch[itemsLabel].push(newNode);
            FolderService.sortList(branch[itemsLabel], sortKey, reverseOrder);

            trackUpdate();
        };
        /** @expose **/
        TreeControlService.prototype.deleteBranchExternal = function (match) {
            var foundNode = null;

            var findNode = function (nodes) {
                _.any(nodes, function (node) {
                    if (foundNode) {
                        return true;
                    }

                    if (!node['isFolder'] && match(node)) {
                        foundNode = node;
                    } else if (node[itemsLabel] && node[itemsLabel].length) {
                        findNode(node[itemsLabel]);
                    }
                });
            };
            findNode(scope.treeData);

            if (foundNode) {
                tree.deleteBranch(foundNode);
                //also delete the selected nodes instance
                _.remove(scope.selectedBranches, function (branch) {
                    return branch === foundNode;
                });

                trackUpdate();
                return foundNode;
            }
        };
        /** @expose **/
        TreeControlService.prototype.updateBranchExternal = function (match, update) {
            var foundNode = null;

            var findNode = function (nodes) {
                _.any(nodes, function (node) {
                    if (foundNode) {
                        return true;
                    }

                    if (!node['isFolder'] && match(node)) {
                        foundNode = node;
                    } else if (node[itemsLabel] && node[itemsLabel].length) {
                        findNode(node[itemsLabel]);
                    }
                });
            };

            findNode(scope.treeData);

            if (foundNode) {
                update(foundNode, function (sort) {
                    var p = tree.getParentBranch(foundNode) || scope.treeData;
                    while (p !== undefined) {
                        if (!_.isFunction(sort)) {
                            FolderService.sortList(p[itemsLabel] || p, sort);
                        } else {
                            sort(p[itemsLabel] || p);
                        }
                        p = tree.getParentBranch(p);
                    }
                });

                trackUpdate();
            }
        };
        /** @expose */
        TreeControlService.prototype.addBranchWithParent = function (parent, newBranch) {
            if (parent !== undefined) {
                parent[itemsLabel].push(newBranch);
                parent['expanded'] = true;
                trackUpdate();
            } else {
                scope.treeData.push(newBranch);
            }
            return newBranch;
        };
        /** @expose */
        tree.addRootBranch = function (newBranch) {
            tree.addBranchWithParent(null, newBranch);
            return newBranch;
        };

        return TreeControlService;
    }]);
})();