/**
 * GSVPano
 */

var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function(parameter){
    "use strict";
    var _parameters = parameters || {},
        _location,
        _zoom,
        _panoId,
        _panoClient = new google.maps.StreetViewService(),
        _count = 0,
        _total = 0,
        _canvas = [],
        _ctx = [],
        _wc = 0,
        _hc = 0,
        result = null,
        rotation = 0,
        copyright = '',
        onSizeChange = null,
        onPanoramaLoad = null;

    var levelsW = [1, 2, 4, 7, 13, 26];
    var levelsH = [1, 1, 2, 4, 7, 13];

    var widths = [416, 832, 1664, 3328, 6656],
        heights = [416, 416, 832, 1664, 3328];

    var gl = null;
    try{
        var canvas = document.createElement("canvas");
        var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
        var context = null;
        for(var ii = 0; ii < names.length; ++ii){
            gl = canvas.getContext(names[ii]);
        }
    }catch(error){}

    var maxW = 1024;
    var maxH = 1024;

    if(gl){
        var maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        console.log("MAX_TEXTURE_SIZE " + maxTexSize);
        maxW = maxH = maxTexSize;
    }

    this.setProgress = function(p){
        if(this.onProgress){
            this.onProgress(p);
        }
    };

    this.throwError = function(message){
        if(this.onError){
            this.onError(message);
        }else{
            console.error(message);
        }
    };

    this.adaptTextureToZoom = function(){
        var w = widths[ _zoom ],//当前zoom,一张图片的宽度
            h = heights[ _zoom ]; // 当前zoom，一张图片的高度

        _wc = Math.ceil(w / maxW); // x方向，图片数量
        _hc = Math.ceil(h / maxH); // y方向，图片数量

        _canvas = [];
        _ctx = [];

        var ptr = 0;
        for(var y = 0; y < _hc; y++){ // y方向
            for(var x = 0; x < _wc; x++ ){ // x方向
                var c = document.createElement("canvas");
                if( x < (_wc - 1)) c.width = maxW;
                else c.width = w - (maxW * x);
                if( y < (_hc - 1)) c.height = maxH;
                else c.height = h - (maxH * y );

                console.log("新创建canvas:" + c.width + " * " + c.height );
                _canvas.push( c );
                _ctx.push(c.getContext("2d"));
                ptr++;
            }
        }
    };

    this.composeFromTile = function(x, y, texture){
        x *= 512;
        y *= 512;
        var px = Math.floor(x / maxW), py = Math.floor( y / maxH); // px和py表示当前图片所在像素位置

        x -= px * maxW;
        y -= py * maxH;

        _ctx[py * _wc + px].drawImage(texture, 0, 0, texture.width, texture.height, x, y, 512, 512); //每个canvas上画图的位置和地图上x、y对应上。
        this.progress();
    }

    this.progress = function(){
        _count++;

        var p = Math.round(_count * 100 / _total);
        this.setProgress(p);

        if(_count === _total){
            this.canvas = _canvas;
            this.panoId = _panoId;
            this.zoom = _zoom;
            if(this.onPanoramaLoad){
                this.onPanoramaLoad();
            }
        }
    }

    this.loadFromId = function(id){
        _panoId = id;
        this.composePanorama();
    }

    this.composePanorama = function(){
        this.setProgress(0);

        var w = levelsW[ _zoom], //x方向的个数
            h = levelsH[ _zoom], //y方向的个数
            self = this,
            url,
            x,
            y;

        _count = 0;
        _total = w * h;

        var self = this;
        for(var y = 0; y < h; y++){
            for(var x = 0; x < w; x++){
                //var url = 'https://cbks2.google.com/cbk?cb_client=maps_sv.tactile&authuser=0&hl=en&panoid=' + _panoId + '&output=tile&zoom=' + _zoom + '&x=' + x + '&y=' + y + '&' + Date.now();
                var url = 'https://geo0.ggpht.com/cbk?cb_client=maps_sv.tactile&authuser=0&hl=en&panoid=' + _panoId + '&output=tile&x=' + x + '&y=' + y + '&zoom=' + _zoom + '&nbt&fover=2';

                (function(x, y){
                    if(_parameters.useWebGL){
                        var texture = THREE.ImageUtils.loadTexture(url, null, function(){
                            self.composeFromTile(x, y, texture);
                        });
                    }else{
                        var img = new Image();
                        img.addEventListener("load", function(){
                            self.composeFromTile(x, y, this);
                        });
                        img.crossOrigin = "";
                        img.src = url;
                    }
                })(x, y);
            }
        }
    };

    this.load = function(location, id){
        var self = this;
        _panoClient.getPanoramaById(id, function(result, status){
            if(status === google.maps.StreetViewStatus.OK){
                self.result = result;
                if(self.onPanoramaData){
                    self.onPanoramaData(result);
                }
                var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
                rotation = (result.titles.centerHeading - h) * Math.PI / 180.0;
                copyright = result.copyright;
                self.copyright = result.copyright;
                _panoId = result.location.pano;
                self.location = location;
                self.composePanorama();
            }else{
                if(self.onNoPanoramaData) self.onNoPanoramaData(status);
                self.throwError("不能获取panorama,原因如下：" + status);
            }
        });
    };

    this.setZoom = function(z){
        _zoom = z;
        this.adaptTextureToZoom();
    };

    this.setZoom(_parameters.zoom || 1);
};
