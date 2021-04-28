/*모듈은 변수, 함수 등의 코드가 모여진 단위이다.
== 라이브러리 
개발자가 모듈을 정의할 때는 내장객체중 export 객체를 사용한다.*/


//getMsg 메서드를 현재 모듈 안에 정의한다.
exports.getMsg = function(){
    return "this message is from my module";
}

//랜덤값 가져오기

exports.getRandom = function(n){
    var r = parseInt(Math.random() * n);
    return r;
}
//한자리 수에 0 붙이기
exports.getZeroString = function(n){
    var result = (n >= 10) ? n: "0"+ n;
    return result;
}



//메세지 처리 함수
exports.getMsgUrl = function(msg, url){
    var tag = "<script>";
    tag += "alert('"+msg+"');";
    tag += "location.href='"+url+"';";
    tag += "</script>";
    return tag;
}
//원하는 메세지 출력 후 돌아가기
exports.getMsgBack = function(msg){
    var tag = "<script>";
    tag += "alert('"+msg+"');";
    tag += "history.back();";
    tag += "</script>";
    return tag;

}