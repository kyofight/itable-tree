'use strict';

(function () {
    angular.module('iTableTree').service('UtilService', UtilService);

    function UtilService () {

    }

    UtilService.prototype.generateUUID = function () {
        var d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
    };

    UtilService.prototype.getScrollBarWidth = function () {
        var inner = document.createElement('p');
        inner.style.width = '100%';
        inner.style.height = '200px';

        var outer = document.createElement('div');
        outer.style.position = 'absolute';
        outer.style.top = '0px';
        outer.style.left = '0px';
        outer.style.visibility = 'hidden';
        outer.style.width = '200px';
        outer.style.height = '150px';
        outer.style.overflow = 'hidden';
        outer.appendChild(inner);

        document.body.appendChild(outer);
        var w1 = inner.offsetWidth;
        outer.style.overflow = 'scroll';
        var w2 = inner.offsetWidth;
        if (w1 === w2) {
            w2 = outer.clientWidth;
        }

        document.body.removeChild(outer);

        return (w1 - w2);
    };

    UtilService.prototype.calculateColWidth = function ($scope) {
        $scope.options.isFitTreeContainer
    };


    UtilService.prototype.setCellWidth = function ($scope, diffWidth) {
        var treeWidth = 0;
        angular.forEach($scope.colDefs, function (col) {
            treeWidth += col.width;
        });
        var w = $scope.containerWidth;
        var hasScrollBar = false;
        $scope.treeBody = angular.element('#itree-' + $scope.$id + ' .itable-body');
        var wrapperWidth = $scope.treeBody.width();
        if ($scope.treeBody.length && $scope.treeBody[0]) {
            hasScrollBar = $scope.treeBody.get(0).scrollHeight >= $scope.treeBody.outerHeight();
            w = hasScrollBar ? (w - $scope.scrollbarWidth) : w;
        }

        if (diffWidth === undefined && wrapperWidth > treeWidth) {
            var newWidth = 0;
            //expand to fit the container
            angular.forEach($scope.colDefs, function (col) {
                col.width = (col.width / treeWidth) * wrapperWidth;
                newWidth += col.width;
            });
            //add the rounded width
            if (newWidth < wrapperWidth) {
                $scope.colDefs[0].width += wrapperWidth - newWidth;
            }
        } else {
            for (var i = 0; i < $scope.colDefs.length; i++) {
                if ($scope.resizingCol.$$hashKey === $scope.colDefs[i].$$hashKey) {
                    var col = $scope.colDefs[i + 1];
                    var newWidth = (parseFloat(resizingCol['width']) + diffWidth);
                    if (newWidth < resizingCol['minWidth']) {
                        // = resizingCol['minWidth'] + diffWidth;
                        //resizingCol['width'] = resizingCol['minWidth'];
                    } else {
                        //var curw = col['width'];
                        var nw = col['width'] - diffWidth;
                        if (nw < col['minWidth']) {
                            //diffWidth = curw - col['minWidth'];
                            //col['width'] = col['minWidth'];
                            //resizingCol['width'] -= diffWidth;
                        } else {
                            col['width'] = nw;
                            resizingCol['width'] = newWidth;
                        }
                    }
                    break;
                }
            }
        }


        if ($scope.$root && !$scope.$root.$$phase) {
            $scope.$digest();
        }
    };

})();