// Union/disjoint set collection
class UnionDisjoint{	
	constructor(n){
		this.set = []
		for( var i=0; i<n; i++) this.set[i] = i
	}

	reduce(i){
		if(this.set[i]!=i) this.set[i] = this.reduce(this.set[i])
		return this.set[i]
	}

	union(i, j){
		i = this.reduce(i)
		j = this.reduce(j)
		this.set[j] = this.set[i]
	}

	canonical(){ for(var i=0; i<this.set.length; i++) this.reduce(i) }
}

/**
 * A color image
 */
class KImage{
	/**
	 * Creates a color image
	 * @param {*} data Data image (rgba uint values)
	 * @param {*} width Width of the image 
	 */
	constructor(data, width){
		this.data = data
		this.height = Math.floor((data.length>>2) / width)
		this.width = width
	}

	/**
	 * Draws the image in the canvas at the given position
	 */
	draw(ctx, x=0, y=0){ 
		if(this.width > 0)
			ctx.putImageData(new ImageData(this.data, this.width), x, y) 
	}

	/**
	 * Transforms the image to gray tones
	 */
	toGray(c=[0.2126, 0.7152, 0.0722] ){
		var data = this.data
		var gdata = []
		var k=0
		for(var i=0; i<this.height; i++){
			gdata[i] = []
			for(var j=0; j<this.width; j++){
				gdata[i][j] = Math.floor(c[0]*data[k] + c[1]*data[k+1] + c[2]*data[k+2]) 
				k += 4
			}
		}
		return new GImage(gdata, this.width, this.height)
	}
}

/**
 * A Gray tones image
 */
class GImage{
	/**
	 * Creates a gray tones image
	 * @param {*} data Matrix (height*width) of gray tones representing the image
	 */
	constructor(data){
		this.data = data
		this.height = data.length
		if(this.height>0) this.width = data[0].length
		else this.width = 0
	}

	/**
	 * Creates a clone of the gray tones image
	 * @returns A clone of the gray tones image
	 */
	clone(){
		var data = []
		for(var i=0; i<this.height; i++){
			data[i] = []
			for(var j=0; j<this.width; j++)
				data[i] = this.data[i]
		}
		return new GImage(data)
	}

	/**
	 * Extracts a region (rect) of the gray tones image
	 * @param {*} x Initial column coordinate of the region to extract
	 * @param {*} y Initial row coordinate of the region to extract
	 * @param {*} width Width of the region to extract
	 * @param {*} height Height of the region to extract
	 * @returns A region (rect) of the gray tones image
	 */
	extract(x, y, width, height){
		var x2 = x+width
		var y2 = y+height
		var data = []
		var k=0
		for(var i=y; i<y2; i++){
			data[k] = []
			var l=0
			for(var j=x; j<x2; j++){
				data[k][l] = this.data[i][j]
				l++
			}
			k++
		}
		return new GImage(data)
	}

	/**
	 * Applies a blur filter to the gray tones image
	 * @param {*} size Size of the bluring patch
	 */
	blur( size=6 ){
		var data = this.data
		var width = this.width
		var height = this.height
		var blurdata = []
		var delta = size>>1
		for(var i=0; i<height; i++){
			blurdata[i] = []
			var min_i = i<delta?0:(i-delta)
			var max_i = (i+delta)>height?height:(i+delta)
			for(var j=0; j<width; j++){
				var min_j = j<delta?0:(j-delta)
				var max_j = (j+delta)>width?width:(j+delta)
				var s = 0
				var count = 0
				for(var n=min_i; n<max_i; n++)
					for(var m=min_j; m<max_j; m++){
						s += data[n][m]
						count++
					}	
				blurdata[i][j] = Math.floor(s/count)
			}
		}
		this.data = blurdata
	}

	/**
	 * Creates a black and white image from the image
	 * @param {*} size Size of the bluring patch to apply to the image
	 * @returns A black and white image from the image
	 */
	toBW( size=6 ){
		var img = this.clone()
		img.blur(size)
		var data = []
		for(var i=0; i<this.height; i++){
			data[i] = []
			for(var j=0; j<this.width; j++){
				data[i][j] = (img.data[i][j]-5<=this.data[i][j])? 0 : 1
			}
		}
		return new BWImage(data)
	}

	/**
	 * Gets a color for a gray tone
	 * @param {*} value Gray tone
	 * @returns RGBA color representing the gray tone
	 */
	color(value){ return [value, value, value, 255]	}

	/**
	 * Creates a color image from the gray tones image
	 * @returns A color image
	 */
	toKImage(){
		var data = new Uint8ClampedArray((this.width*this.height)<<2)
		var k=0
		for(var i=0; i<this.height; i++)
			for(var j=0; j<this.width; j++){
				var c = this.color(this.data[i][j])
				for(var l=0; l<4; l++) data[k+l] = c[l]
				k+=4
			}
		return new KImage(data,this.width)
	}

	/**
	 * Draws the gray tones image in a canvas
	 * @param {*} ctx Drawing canvas 
	 * @param {*} x Initial column position of the image in the canvas
	 * @param {*} y Initial row position of the image in the canvas
	 */
	draw(ctx, x=0, y=0){ this.toKImage().draw(ctx, x, y) }

}

/**
 * A black and white only image
 */
class BWImage extends GImage{
	/**
	 * Creates a black and white image
	 * @param {*} data Black and white image matrix (0: white, 1:black)
	 */
	constructor(data){ super(data) }

	/**
	 * Gets a color for black and white colors
	 * @param {*} value Black or white color
	 * @returns RGBA color representing the black or white color
	 */
	color(value){ return super.color((value==1)?0:255) }

	/**
	 * Extracts a region (rect) of the gray tones image
	 * @param {*} x Initial column coordinate of the region to extract
	 * @param {*} y Initial row coordinate of the region to extract
	 * @param {*} width Width of the region to extract
	 * @param {*} height Height of the region to extract
	 * @returns A region (rect) of the gray tones image
	 */
	extract(x, y, width, height){
		var ext = super.extract(x, y, width, height)
		return new BWImage(ext.data)
	}

	isBlack(column, row){ return this.data[row][column]==1 }

	regions(){
		var x = this
		var height = this.height
		var width = this.width
		var white = -1
		var set = new UnionDisjoint(width*height)
		for( var i=0; i<height; i++ ){
			for(var j=0; j<width; j++){
				var pos = i*width+j
				if(this.isBlack(j, i)){
					if(j>0 && this.isBlack(j-1,i)) set.union(pos-1, pos)
					if(i>0){
						if(j>0 && this.isBlack(j-1,i-1)) set.union((i-1)*width+j-1, pos)
						if(this.isBlack(j, i-1)) set.union((i-1)*width+j, pos)
						if(j<width-1 && this.isBlack(j+1,i-1)) set.union((i-1)*width+j+1, pos)
					}
				}else{
					if(white!=-1) set.set[pos] = white
					else white = pos
				}
			}
		}
		set.canonical()
		set = set.set
		var dict = {}
		for(var i=0; i<set.length; i++){
			if(set[i] != white){
				var id = 'p'+set[i]
				if(dict[id] === undefined)  dict[id] = []
				dict[id].push([i%width, Math.floor(i/width)])
			}
		}
		for(var x in dict) dict[x] = new Region(x, dict[x])
		return dict
	}

    delete_row(i){
        if(0<=i && i<this.height){
            this.data.splice(i,1)
            this.height--
        }
    }

    insert_row(i){
        if(0<=i && i<=this.height){
            var row=[]
            for(var j=0; j<this.width; j++) row[j] = 0
            this.data.splice(i,0,row)
            this.height++
        }
    }

    delete_col(j){
        if(0<=j && j<this.width){
            for(var i=0; i<this.height; i++) this.data[i].splice(j,1)
            this.width--
        }
    }

    insert_col(j){
        if(0<=j && j<=this.width){
            for(var i=0; i<this.height; i++) this.data[i].splice(j,0,0)
            this.width++
        }
    }
}

class Region{
	constructor(id, pixels){
		this.id = id
		this.pixels = pixels
		this.box = null
		this.boxing()
		this.rcontour = null
		this.contour()
		this.bmp = null
		this.bitmap()
	}
	
	boxing(){
		var x = this
		if(x.box != null) return x.box
		x.left = x.pixels[0][0]
		x.right = x.left
		x.top = x.pixels[0][1]
		x.bottom = x.top
		for(var i=1; i<x.pixels.length; i++){
			if(x.left>x.pixels[i][0]) x.left = x.pixels[i][0]
			if(x.right<x.pixels[i][0]) x.right = x.pixels[i][0]
			if(x.top>x.pixels[i][1]) x.top = x.pixels[i][1]
			if(x.bottom<x.pixels[i][1]) x.bottom = x.pixels[i][1]
		}
		x.box = [x.left, x.top, x.right+1, x.bottom+1]
		x.height = x.bottom-x.top+1
		x.width = x.right-x.left+1
		for(var i=0; i<x.pixels.length; i++){
			x.pixels[i][0] -= x.left
			x.pixels[i][1] -= x.top
		}
		return x.box
	}

	contour(){
		var x = this
		if(x.rcontour != null) return x.rcontour
		x.boxing()
		var bottom = []
		var top = []
		var left = []
		var right = []
		for(var j=0; j<x.width; j++){
			bottom[j] = -1
			top[j] = x.height
		}
		for(var i=0; i<x.height; i++){
			right[i] = -1
			left[i] = x.width
		}

		for(var k=0; k<x.pixels.length; k++){
			var i = x.pixels[k][1]
			var j = x.pixels[k][0]
			if(i<top[j]) top[j] = i
			if(bottom[j]<i) bottom[j] = i

			if(j<left[i]) left[i] = j
			if(right[i]<j) right[i] = j
		}

		x.rarea = 0
		var c = []
		var k=0
		for(var i=0; i<x.height; i++){
			c[k] = [left[i], i]
			k++
			c[k] = [right[i], i]
			k++
			x.rarea += right[i]-left[i]+1
		}
		for(var i=0; i<x.width; i++){
			c[k] = [i, top[i]]
			k++
			c[k] = [i, bottom[i]]
			k++
		}

		x.rcontour = c
		return x.rcontour
	}

	dimension(){
		this.boxing()
		return [this.width, this.height]
	}

	area(){
		this.contour()
		return this.rarea
	}

	bitmap(){
		if(this.bmp != null) return this.bmp
		var box = this.boxing()
		var bmp = []
		var w = this.width
		var h = this.height
		for(var i=0;i<h; i++){
			bmp[i] = []
			for(var j=0; j<w; j++) bmp[i][j] = 0
		}
		for(var k=0;k<this.pixels.length; k++)
			if(0<=this.pixels[k][1] && this.pixels[k][1]<h && 0<=this.pixels[k][0] && this.pixels[k][0]<w )
				bmp[this.pixels[k][1]][this.pixels[k][0]] = 1

		this.bmp = new BWImage(bmp, w, h)
		return this.bmp
	}

	draw(ctx, x=0, y=0){
		var bmp = this.bitmap()
		bmp.draw(ctx, x+this.left, y+this.top)
	}

	contains(region){
		this.boxing()
		region.boxing()
		return this.left <= region.left && region.right <= this.right && this.top <= region.top && region.bottom <= this.bottom
	}

	included(regions){
		this.boxing()
		var width = this.width

		var regs = {}
		for(var x in regions){
			var r = regions[x]
			if(this.contains(r)) regs[x] = r
		}
		return regs
	}

	size(){ return this.pixels.length; }

	transform( XO, YO, XT, YT ){
		var tr = new Transform()
		var px = []
		for(var k=0; k<this.pixels.length; k++){
			var p = [this.pixels[k][0]+this.left, this.pixels[k][1]+this.top]
			p = tr.to01(XO, YO, p[0], p[1])
			p = tr.from01(XT, YT, p[0], p[1])
			if(p[0]!=NaN && p[1]!=NaN) px.push(p)
		}
		return new Region('T'+this.id, px)
	}

    absolute(p=[]){
        for(var i=0; i<this.pixels.length; i++)
            p[i] = [this.pixels[i][0] + this.left, this.pixels[i][1] + this.top]
        return p
    }

    merge(region){
        var p = this.absolute()
        p = region.absolute(p)
        return new Region(this.id+region.id, p)
    }
}


class Transform{
	constructor(){}

	to01( XO, YO, x, y ){
		var a = XO[1]-XO[0]
		var b = XO[2]-XO[3]
		var c = YO[1]-YO[0]
		var d = YO[2]-YO[3]
		var e = YO[3]-YO[0]
		var f = d-c
		var g = XO[3]-XO[0]
		var h = b-a
		var i = y-YO[0]
		var j = x-XO[0]

		if(c==0 && d==0){
			var beta = (y-YO[0])/e
			var x1 = XO[0]*(1-beta) + XO[3]*beta
			var x2 = XO[1]*(1-beta) + XO[2]*beta
			var alpha = (x-x1)/(x2-x1)
			return [alpha,beta]
		}
		var ta = h*c-a*f
		var tb = (e*a+h*i-f*j-g*c)
		var tc = e*j-g*i
		var alpha1 = (tb+Math.sqrt(tb*tb-4*ta*tc))/2/ta
		var alpha2 = (tb-Math.sqrt(tb*tb-4*ta*tc))/2/ta
		var alpha = (0<=alpha1 && alpha1<=1.0)?alpha1:alpha2
		var beta = (y-YO[0]-c*alpha)/(e+f*alpha)
		return [alpha, beta]
	}

	from01( XT, YT, alpha, beta){
		var a = XT[1]-XT[0]
		var b = XT[2]-XT[3]
		var c = YT[1]-YT[0]
		var d = YT[2]-YT[3]
		var xt = XT[0] + a*alpha
		var xb = XT[3] + b*alpha
		var yt = YT[0] + c*alpha
		var yb = YT[3] + d*alpha
		var x = Math.floor(xt + beta*(xb-xt))
		var y = Math.floor(yt + beta*(yb-yt))
		return [x,y]
	}
}

function draw(ctx, regions, X=0, Y=0){
	for( var x in regions ) regions[x].draw(ctx,X,Y)
}
