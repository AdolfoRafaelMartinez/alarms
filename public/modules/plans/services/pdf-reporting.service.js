
'use strict';

angular.module('plans').factory('pdfReporting', ['$resource', '$q', '$http',
    function($resource, $q, $http) {
        return function(planId) {
            var deferred = $q.defer();
            var iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = -9000;
            document.body.appendChild(iframe);
            iframe.src = `/pdf-report/${planId}`;
            iframe.onload = function() {

                setTimeout(renderCanvas, 100);

                function renderCanvas() {
                    html2canvas(iframe.contentDocument.documentElement, {
                        onrendered: c => {
                            var jpg = Canvas2Image.convertToJPEG(c);
                            $http.post(`/pdf-report/${planId}`, {jpg: jpg.src})
                                .then(response => {
                                    deferred.resolve({file: response.data.img, image: jpg.src});
                                }, error => {
                                    deferred.reject(error);
                                });
                            document.body.removeChild(iframe);
                        }
                    });
                }
            };

            return deferred.promise;
        };
    }]);
