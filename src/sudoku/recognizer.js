class SBRegion{
	constructor(region, color='green'){ 
		this.region = region
		this.color = color
		this.tr = new Transform()
		this.x = null
		this.corners()
		this.cells = null
	}

	draw(ctx, x=0, y=0){
		//this.region.draw(ctx, x, y)
		this.drawgrid(ctx)
		// Draw empty
		
	}

	keep(regions){
		var sb = this.region
		var nr = {}
		sb.boxing()
		var w = sb.width/9
		var h = sb.height/9
		var count = 0
		for(var x in regions){
			var r = regions[x]
			r.boxing()
			if(r.width<=5*w/6 && r.width>=w/6 && r.height<=5*h/6 && r.height>=h/6 ){
				count++
				nr[x] = r
			}
		}
		return nr
	}

	// Compute the Sudoku board corners
	corners(){
		if(this.x != null ) return [this.x, this.y]
		var r = this.region
		var c = this.region.contour()
		function farthest(x, y){
			var d = 0.0
			var k=0
			for(var i=1; i<c.length; i++){
				var d2 = (x-c[i][0])*(x-c[i][0])+(y-c[i][1])*(y-c[i][1])
				if(d2>=d){
					k = i
					d = d2
				}
			}
			return c[k]
		}

		var LT = farthest(r.width, r.height)
		var TR = farthest(0, r.height)
		var RB = farthest(0, 0)
		var BL = farthest(r.width, 0)


		this.x = [LT[0]+r.left, TR[0]+r.left, RB[0]+r.left, BL[0]+r.left]
		this.y = [LT[1]+r.top, TR[1]+r.top, RB[1]+r.top, BL[1]+r.top]

		for(var i=0; i<this.x.length;i++){
			if(Math.abs(this.x[i]-this.x[(i+1)%this.x.length])<2 && Math.abs(this.y[i]-this.y[(i+1)%this.y.length])<2){
				this.x = null
				this.y = null
				return null
			}
		}

		return [this.x, this.y]
	}

	drawgrid(ctx, X=0, Y=0){
		this.corners()
		var x = this.x
		var y = this.y
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = this.color

		ctx.beginPath()
		ctx.moveTo(x[0]+X,y[0]+Y)
		for (var i = 1; i < x.length; i++) ctx.lineTo(x[i]+X, y[i]+Y)
		ctx.lineTo(x[0], y[0])
		ctx.stroke()

		for(var k=1;k<9; k++){
			ctx.beginPath()
			var p = this.tr.from01(x, y, k/9, 0)
			ctx.moveTo(p[0]+X,p[1]+Y)
			p = this.tr.from01(x, y, k/9, 1)
			ctx.lineTo(p[0]+X,p[1]+Y)
			p = this.tr.from01(x, y, 0, k/9)
			ctx.moveTo(p[0]+X,p[1]+Y)
			p = this.tr.from01(x, y, 1, k/9)
			ctx.lineTo(p[0]+X,p[1]+Y)
			ctx.stroke()
		}
	}
}

class SBProcessor{
	// Gets the region that represents the sudoku board
	constructor( regions, width, height, min_size=0.2 ){
		this.WT = 270 // Extracted standarized sudoku board width
		this.HT = 270 // Extracted standarized sudoku board height
		this.ODW = 12 // Extracted digit width
		this.ODH = 16 // Extracted digit height 
		this.DW = 6 // Neural net digit width
		this.DH = 8 // Neural net digit height

		var area = width*height
		var rel = 0
		var reg = null
		for( var x in regions ){
			var dim = regions[x].dimension()
			var ratio = 0
			if(dim[0]>dim[1]) ratio = dim[1]/dim[0]
			else ratio = dim[0]/dim[1]
			var size = regions[x].area()
			var value = ratio*size
			if(value>rel){
				rel = value
				reg = regions[x]
			}
		}
		if(reg!=null && reg.area()/(width*height)>=min_size){
			delete regions[reg.id]
			regions = reg.included(regions)
			this.SB = new SBRegion(reg)
			if(this.SB.x==null) this.SB = null
			else this.regions = this.SB.keep(regions)
		}else this.SB = null

		this.ready = this.SB != null
	}

	draw(ctx, solution, digits, X=0, Y=0){
		if(this.SB!=null){
			this.SB.draw(ctx,X,Y)
			if(solution.length > 0){
				var corners = this.SB.corners()
				var XT = corners[0]
				var YT = corners[1]
				var XO = [0, this.WT, this.WT, 0]
				var YO = [0, 0, this.HT, this.HT]
				var cw = this.WT/9
				var ch = this.HT/9
				var trs = {}
				for(var i=0; i<solution.length; i++){
					var r = digits[solution[i][2]]
					r.left = solution[i][1]*cw + 10
					r.top = solution[i][0]*ch + 10
					var r = r.transform(XO, YO, XT, YT)
					r.id = ''+i
					trs[r.id] = r
				}
		
				draw(ctx, trs, X, Y)
			}
		}
	}

	transform(){
		if(this.SB==null) return null
		var corners = this.SB.corners()
		var XO = corners[0]
		var YO = corners[1]
		var XT = [0, this.WT, this.WT, 0]
		var YT = [0, 0, this.HT, this.HT]
		var trs = {}
		for(var x in this.regions){
			var r = this.regions[x].transform(XO, YO, XT, YT)
			trs[r.id] = r
		}
		return trs
	}

	init_cells(){
		var cells = []
		for( var i=0; i<9; i++ ){
			cells[i] = []
			for(var j=0; j<9; j++){
				cells[i][j] = []
			}
		}
		return cells
	}

	locate(){
		if(this.SB==null) return null
		var regions = this.transform()

		var cw = this.WT/9
		var ch = this.HT/9
		var cells = this.init_cells()
		for(var x in regions){
			var box = regions[x].boxing()
			if(box[0]>=0 && box[2]<this.WT && box[1]>=0 && box[3]<this.HT){
				var w = regions[x].width
				var h = regions[x].height
				if(w<cw/2 && h<3*ch/5){
					var cx = Math.floor((box[2]+box[0])/cw/2)
					var cy = Math.floor((box[3]+box[1])/ch/2)
					cells[cy][cx].push(regions[x])
				}
			}
		}
		cells = this.unify_cells(cells)
		cells = this.standarized_cells(cells)
		return cells
	}

	unify_cells(cells){
		for( var i=0; i<9; i++ ){
			for(var j=0; j<9; j++){
				if(cells[i][j].length > 0){
					var r = cells[i][j][0]
					for(var k=1; k<cells[i][j].length; k++)	r = r.merge(cells[i][j][k])
					cells[i][j] = r
				}else cells[i][j] = null
			}
		}
		return cells
	}

	std_rows(bmp){
		var r = bmp.height - this.ODH
		while(r>=2){
			bmp.delete_row(bmp.height-1)
			bmp.delete_row(0)
			r-=2
		}
		if(r==1){
			var l = bmp.height-1
			var c1=0
			var c2=0
			for(var j=0;j<bmp.width;j++){
				c1 += bmp.data[0][j]
				c2 += bmp.data[l][j]
			}
			if(c1>c2) bmp.delete_row(l) 
			else bmp.delete_row(0)
		}else{
			while(r<=-2){
				bmp.insert_row(0)
				bmp.insert_row(bmp.height)
				r+=2
			}
			if(r==-1) bmp.insert_row(bmp.height)
		}
		return bmp
	}

	std_cols(bmp){
		var r = bmp.width - this.ODW
		while(r>=2){
			bmp.delete_col(bmp.width-1)
			bmp.delete_col(0)
			r-=2
		}
		if(r==1){
			var l = bmp.width-1
			var c1=0
			var c2=0
			for(var i=0;i<bmp.height;i++){
				c1 += bmp.data[i][0]
				c2 += bmp.data[i][l]
			}
			if(c1>c2) bmp.delete_col(l) 
			else bmp.delete_col(0)
		}else{
			while(r<=-2){
				bmp.insert_col(0)
				bmp.insert_col(bmp.width)
				r+=2
			}
			if(r==-1) bmp.insert_col(bmp.width)
		}
		return bmp
	}

	standarized_cells(cells){
		for( var i=0; i<9; i++ ){
			for(var j=0; j<9; j++){
				if(cells[i][j] != null){
					var bmp = cells[i][j].bitmap()
					bmp = this.std_rows(bmp)
					bmp = this.std_cols(bmp)
					cells[i][j] = bmp
				}
			}
		}
		return cells
	}
}

class Recognizer{
    constructor(){
        this.digits = [[],
        [[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]],


        [[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]],

        [[0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]],

        [[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0]],

        [[0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0]],

        [[0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]],

        [[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0]],

        [[0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
        [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0]],

        [[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0],
        [0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0]]
        ]

		this.regions = [null]
		for(var k=1; k<this.digits.length; k++){
			var pixels = []
			var d = this.digits[k]
			for(var i=0; i<d.length; i++)
				for(var j=0; j<d[i].length; j++)
					if(d[i][j]==1) pixels.push([j,i])
			this.regions[k] = new Region('d'+k,pixels)
		}

        this.counter = 0
        this.boards = []
        this.board = []
        for(var i=0; i<9; i++){
            this.board[i] = []
            for(var j=0; j<9; j++){
                this.board[i][j] = 0
            }
        }
    }

    index(bmp, k){
        var c = 0   
        for(var i=0; i<bmp.height; i++)
            for(var j=0; j<bmp.width; j++)
                c += (bmp.data[i][j]==this.digits[k][i][j])?1:0
        return c
    }

    match_cell(bmp){
        var m = this.index(bmp,1)
        var k = 1
        for(var l=2;l<10;l++){
            var m2 = this.index(bmp,l)
            if(m2>m){
                k = l
                m = m2
            }
        }
        return k
    }

	match(cells){
        var board = []
        for(var i=0; i<cells.length; i++){
            board[i] = []
            for(var j=0; j<cells[i].length; j++){
                if(cells[i][j]!=null){
                    board[i][j] = this.match_cell(cells[i][j])
                }else board[i][j] = 0
            }
        }
        return board
	}

    apply(cells){
        this.boards[this.counter] = this.match(cells)
        this.counter++
        if(this.counter%13==0){
            for(var i=0; i<9; i++){
                for(var j=0; j<9; j++){
                    var c = [0,0,0,0,0,0,0,0,0,0]
                    for(var k=0;k<this.counter;k++) c[this.boards[k][i][j]]++
                    c[0]=0
                    var m=0
                    for(var k=1;k<this.counter;k++)
                        if(c[k]>c[m]) m=k
                    this.board[i][j] = m
                }
            }
            this.counter = 0
            return this.board
        }else return null
    }
}