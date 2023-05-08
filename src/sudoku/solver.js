function validate_row(board, i){
    var c = [0,0,0,0,0,0,0,0,0,0]
    for(var j=0; j<9; j++) c[board[i][j]]++
    var j=1
    while(j<10 && c[j]<=1) j++
    return j==10 
}

function validate_col(board, j){
    var c = [0,0,0,0,0,0,0,0,0,0]
    for(var i=0; i<9; i++) c[board[i][j]]++
    var i=1
    while(i<10 && c[i]<=1) i++
    return i==10 
}

function validate_square(board, k){
    var c = [0,0,0,0,0,0,0,0,0,0]
    var ik = Math.floor(k/3)
    var jk = k%3
    for(var i=0; i<3; i++) 
        for(var j=0; j<3; j++)
            c[board[3*ik+i][3*jk+j]]++
    var k=1
    while(k<10 && c[k]<=1) k++
    return k==10 
}

function validate(board){
    var k=0
    while(k<9 && validate_row(board,k) && validate_col(board,k) && validate_square(board,k)) k++
    return k==9
}

function empty(board){
    for(var i=0; i<9; i++)
        for(var j=0; j<9; j++)
            if(board[i][j]==0) return [i,j]
    return null
}

function solve(board){
    var pos = empty(board)
    if(pos == null) return true
    for(var k=1; k<=9; k++){
        board[pos[0]][pos[1]] = k
        if(validate(board) && solve(board)) return true
        board[pos[0]][pos[1]] = 0
    }
    return false
}