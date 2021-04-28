var http = require("http");
var express = require("express");
var static = require("serve-static");
var ejs = require("ejs");
var path = require("path");
var mysql = require("mysql");
var multer = require("multer");
var expressSession = require("express-session"); // 로그인처리용, 서버측 세션을 처리
var fs = require("fs");
var mymodule=require("./lib/mymodule.js");
const { response, request } = require("express");

const conStr={
    url:"localhost",
    user:"root",
    password:"1234",
    database:"project1",
    multipleStatements : true
}

var upload = multer({//request객체의 분석
    storage:multer.diskStorage({
        destination:function(req, file, cb){
            cb(null, __dirname+"/static/image/product_img")
        },
        filename:function(req, file, cb){
            cb(null, new Date().valueOf()+path.extname(file.originalname));
        }
    })
})

var app=express();
app.use(static(__dirname+"/static"));
app.use(express.urlencoded({
    extended:true
}))//post 요청의 파라미터를 받아오는 모듈
app.use(expressSession({
    secret:"key secret",
    resave:true,
    saveUninitialized:true
}))//세션 설정

//서버 스크립트의 위치 등록(뷰엔진)
app.set("view engine","ejs")
/*------------------------------For admin --------------------------- */
//관리자 로그인 폼
app.get("/admin/loginform",function(request, response){
    response.render("admin/login");
});
//관리자 로그인
app.post("/admin/login", function(request, response){
    var master_id = request.body.master_id;
    var master_pass = request.body.master_pass;
    // console.log(request);

    var sql = "select * from admin where master_id=? and master_pass=?"

    var con=mysql.createConnection(conStr);
    con.query(sql,[master_id,master_pass], function(err, result, fields){
        if(err){
            console.log("조회 실패",err);
        }else{
            if(result.length<1){
                console.log("로그인에 실패했습니다..")
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("로그인 정보가 올바르지 않습니다!"))
            }else{
                request.session.admin={
                    admin_id:result[0].admin_id,
                    master_id:result[0].master_id,
                    master_pass:result[0].master_pass,
                    master_name:result[0].master_name
                };
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgUrl("어서오십시오, "+request.session.admin.master_name+" 님","/admin/main"))
            }
        }
        con.end();
    })
})
//관리자용 메인페이지
app.get("/admin/main",function(request, response){
    var sql = "select m.season_id, s.season_name, count(s.season_name) as cnt from marketdata as m join seasoncategory as s on m.season_id = s.season_id group by m.season_id"
    
    var con = mysql.createConnection(conStr)
    con.query(sql, function(err, result, fields){
        if(err){
            console.log(err)
        }else{
            // console.log();
            response.render("admin/main",{
                seasonRec:result,
                adminUser:request.session.admin
            })
        }
        con.end();
    })
    //인증된 관리자 이름.. 프로그램적으로 변동할수있게하려고.
    // checkAdminSession(request, response, "admin/main");
    
});

//차트데이터 가져오기
app.get("/admin/main/chart", function(request, response){

    console.log("데이터전달요청받음")
    
    var sql = "select m.season_id, s.season_name, count(s.season_name) as cnt from marketdata as m join seasoncategory as s on m.season_id = s.season_id group by m.season_id";
    var con = mysql.createConnection(conStr);

    con.query(sql, function(err, result, fields){
        if(err){
            console.log("차트데이터 에러",err);
        }else{
            console.log("데이터전달" , result);

            response.writeHead(200,{"Content-Type":"text/json;charset=utf-8"});
            response.end(JSON.stringify(result))
        }
        con.end();
    });
    
});

//상품등록페이지
app.get("/admin/product/registform", function(request, response){
    // checkAdminSession(request, response, "admin/product/registform");
    if(request.session.admin==undefined){
        response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        response.end(mymodule.getMsgUrl("비정상적인 접근입니다.", "/admin/loginform"))
    }else{
        var sql = "select * from seasoncategory"
        
        var con = mysql.createConnection(conStr);
        con.query(sql, function(err, result, fields){
            if(err){
                console.log("95번에러", err)
            }else{
                console.log(result);
                response.render("admin/product/regist",{
                    record:result,
                    adminUser:request.session.admin
                })
            }
            con.end();
        })
    }
})
//색상카테고리? 일단만들어봄.
app.get("/admin/product/colorlist", function(request, response){
    var sql = "select * from colorcategory"
    
    var con = mysql.createConnection(conStr);
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("113번에러",err);
        }else{
            // console.log("result is", result);
            response.writeHead(200,{"Content-Type":"text/json;charset=utf-8"});
            response.end(JSON.stringify(result))
        }
        con.end();
    })
})
//타입카테고리도 ajax를 이용..
app.get("/admin/product/typelist",function(request, response){
    var sql = "select * from typecategory"
    var con = mysql.createConnection(conStr);
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("타입카테고리생성에러", err)
        }else{
            console.log("데이터",result)
            response.writeHead(200,{"Content-Type":"text/json;charset=utf-8"});
            response.end(JSON.stringify(result))
        }
        con.end();
    })
})
//상품 등록 처리
app.post("/admin/product/regist",upload.single("product_img"),function(request, response){
    var season_id = request.body.seasoncategory_id;
    var color_id = request.body.colorcategory_id;
    var market_name = request.body.brand;
    var price = request.body.price;
    var detail = request.body.detail;
    var filename = request.file.filename;
    var sub_name = request.body.product_name;
    var type_id = request.body.typecategory_id;

    var sql = "insert into marketdata(season_id, color_id, sub_name, price, detail, filename, market_name, type_id)"
    sql +=" values(?,?,?,?,?,?,?,?)";

    var con = mysql.createConnection(conStr);
    con.query(sql, [season_id,color_id,sub_name,price,detail,filename,market_name,type_id], function(err,fields){
        if(err){
            console.log("138:",err)
        }else{
            response.redirect("/admin/product/list")
        }
        con.end();
    })
})
//목록
app.get("/admin/product/list", function(request,response){
    var currentPage =1;
    if(request.query.currentPage!=undefined){
        currentPage = request.query.currentPage
    }
    var sql = "select product_id, sub_name, price, market_name, filename"
    sql += " from marketdata order by product_id desc"

    var con = mysql.createConnection(conStr)
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("157 : ", err)
        }else{
            console.log(result);
            response.render("admin/product/list",{
                param : {
                    currentPage : currentPage,
                    record : result
                },
                adminUser:request.session.admin
            })
        }
    })
})

//상세보기
app.get("/admin/product/detail", function(request, response){
    var con = mysql.createConnection(conStr);
    var product_id = request.query.product_id;
    var sql1 = "select * from seasoncategory;"
    var sql2 = " select * from marketdata where product_id = ?;";

    con.query(sql1 + sql2,[product_id], function(err, results, fields){
        if(err){
            console.log(err);
        }else{
            console.log("정보 : ", results[1][0])
            response.render("admin/product/detail",{
                record : results,
                adminUser:request.session.admin
            })
        }
        con.end();
    })
})
//수정하기
app.post("/admin/product/edit",upload.single("product_img"),function(request, response){
    // console.log(request);
    var product_id = request.body.product_id;
    var season_id = request.body.seasoncategory_id;
    var color_id = request.body.colorcategory_id;
    var market_name = request.body.brand;
    var price = request.body.price;
    var detail = request.body.detail;
    var filename = request.file.filename;
    var sub_name = request.body.product_name;
    var img_name = request.body.img_name
    
    var con = mysql.createConnection(conStr);
    var sql = "update marketdata set season_id = ?, color_id = ?, sub_name = ?, price = ?, detail = ?, filename = ?, market_name = ?"
    sql += " where product_id =" + product_id;

    con.query(sql,[season_id,color_id,sub_name,price,detail,filename,market_name],function(err,fields){
        if(err){
            console.log("수정오류",err)
        }else{
            console.log(__dirname)
            fs.unlink(__dirname+"/static/image/product_img/"+img_name,function(err,data){
                if(err){
                    console.log(err);
                }else{
                    // alert("수정완료")
                    response.redirect("/admin/product/list");
                }
            })
        }
        con.end();
    })
})
//삭제처리
app.post("/admin/product/del",function(request, response){
    var product_id = request.body.product_id;
    var img_name = request.body.img_name;
    var sql = "delete from marketdata where product_id = ?"
    var con = mysql.createConnection(conStr);
    con.query(sql,[product_id],function(err,fields){
        if(err){
            console.log(err)
        }else{
            fs.unlink(__dirname+"/static/image/product_img/"+img_name,function(err,data){
                if(err){
                    console.log(err);
                }else{
                    response.redirect("/admin/product/list")
                }
            })
        }
        con.end();
    }); 
})
//사용자 목록 불러오기
app.get("/admin/list/userlist", function(request,response){
    var currentPage =1;
    if(request.query.currentPage!=undefined){
        currentPage = request.query.currentPage
    }
    var sql = "select user_No, user_id, user_name, user_nickname, regdate"
    sql += " from site_user order by user_No desc"

    var con = mysql.createConnection(conStr)
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("157 : ", err)
        }else{
            // console.log(result);
            response.render("admin/list/userlist",{
                param : {
                    currentPage : currentPage,
                    record : result
                },
                adminUser:request.session.admin
            })
        }
    })
})
//이용자 상세보기
app.get("/admin/list/userdetail", function(request, response){
    var sql = "select user_No, user_id, user_pass, user_name, user_nickname, user_birthdate, gender, age, user_intro from site_user where user_No=?"
    var con = mysql.createConnection(conStr)
    var user_No = request.query.user_No;
    con.query(sql, [user_No], function(err, result, fields){
        if(err){
            console.log("유저상세보기에러",err);
        }else{
            console.log(result[0]);
            response.render("admin/list/userdetail",{
                
                adminUser:request.session.admin,
                record : result
            })
        }
        con.end();
    });
})
//유저삭제
app.post("/admin/list/userdelete", function(request, response){
    var user_No = request.body.user_No;
    var sql = "delete from site_user where user_No="+user_No;
    var con = mysql.createConnection(conStr);
    con.query(sql,function(err, fields){
        if(err){
            console.log("삭제실패",err);
        }else{
            response.redirect("/admin/list/userlist");
        }
    });
})
/*----------------------------클라이언트측 요청 ------------------------------ */

//메인페이지
app.get("/homepage/main", function(request, response){
    var sql;
    if(request.session.user == undefined){
        response.render("homepage/main",{
            loginUser : {user_name : "undefined"}
        })
    }else{
        response.render("homepage/main",{
            loginUser : request.session.user
        })

    }
    
})

//회원가입 폼
app.get("/user/registform", function(request, response){
    var sql = "select user_id, user_nickname from site_user"
    var con = mysql.createConnection(conStr)
    con.query(sql,function(err, result, fields){
        if(err){
            console.log("회원가입 폼 불러오기 실패", err)
        }else{
            response.render("homepage/user/registform",{
                record : result
            });

        }
    })
    // checkAdminSession(request, response, "admin/product/registform");    
})
//중복처리(아이디)
app.get("/homepage/user/idcheck", function(request, response){
    var sql = "select user_id, user_nickname from site_user";
    var con = mysql.createConnection(conStr);
    con.query(sql,function(err, result, fields){
        if(err){
            console.log("중복체크 에러",err);
        }else{
            console.log("result = ",result)
            response.writeHead(200,{"Content-Type":"text/json;charset=utf-8"});
            response.end(JSON.stringify(result))
        };
        con.end();
    })
})
//중복처리(닉네임)
app.get("/homepage/user/nickcheck", function(request, response){
    var sql = "select user_id, user_nickname from site_user";
    var con = mysql.createConnection(conStr);
    con.query(sql,function(err, result, fields){
        if(err){
            console.log("중복체크 에러",err);
        }else{
            console.log("result = ",result)
            response.writeHead(200,{"Content-Type":"text/json;charset=utf-8"});
            response.end(JSON.stringify(result))
        };
        con.end();
    })
})
//회원가입처리
app.post("/user/regist", function(request, response){
    // console.log(request)
    var user_id = request.body.user_id;
    var user_pass = request.body.user_pass;    
    var user_nickname = request.body.user_nickname;
    var user_birthdate = request.body.user_birthdate;
    var gender = request.body.gender;
    var age = request.body.age;
    var user_intro = request.body.user_intro;
    var user_name = request.body.user_name
    
    var sql = "insert into site_user(user_id , user_pass, user_nickname, user_birthdate, gender, age, user_intro,user_name)"
    sql+= " values(?,?,?,?,?,?,?,?)"

    var con = mysql.createConnection(conStr)
    con.query(sql,[user_id,user_pass,user_nickname,user_birthdate,gender,age,user_intro,user_name],function(err, fields){
        if(err){
            console.log("회원가입오류", err)
        }else{
            
            response.redirect("../homepage/main")
        }
        con.end();
    })
})

//유저 로그인 폼
app.get("/homepage/user/loginform",function(request, response){
    response.render("homepage/user/login");
});
//유저 로그인
app.post("/homepage/user/login", function(request, response){
    var user_id = request.body.user_id;
    var user_pass = request.body.user_pass;
    // console.log(request);

    var sql = "select * from site_user where user_id=? and user_pass=?"

    var con=mysql.createConnection(conStr);
    con.query(sql,[user_id,user_pass], function(err, result, fields){
        if(err){
            console.log("조회 실패",err);
        }else{
            if(result.length<1){
                console.log("로그인에 실패했습니다..")
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("로그인 정보가 올바르지 않습니다!"))
            }else{
                request.session.user={
                    user_No:result[0].user_No,
                    user_id:result[0].user_id,
                    user_pass:result[0].user_pass,
                    user_name:result[0].user_name
                };
                response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgUrl("어서오십시오, "+request.session.user.user_name+" 님","/homepage/main"))
            }
        }
        con.end();
    })
})
//유저 로그아웃
//유저용 장터게시판 처리
app.get("/homepage/market/market", function(request,response){
    var currentPage =1;
    if(request.query.currentPage!=undefined){
        currentPage = request.query.currentPage
    }
    var sql = "select product_id, sub_name, price, market_name, filename"
    sql += " from marketdata order by product_id desc"

    var con = mysql.createConnection(conStr)
    con.query(sql, function(err, result, fields){
        if(err){
            console.log("157 : ", err)
        }else{
            // console.log(result);
            if(request.session.user == undefined){
                    response.render("homepage/market/market",{
                    param : {
                        currentPage : currentPage,
                        record : result
                    },
                    loginUser : {user_name:"undefined"}
                    })
            }else{
                response.render("homepage/market/market",{
                    param : {
                        currentPage : currentPage,
                        record : result
                    },
                    loginUser : request.session.user
                })
            }
            con.end();
        }
    })
})
//상세보기(회원용)
app.get("/homepage/market/detail", function(request, response){
    var con = mysql.createConnection(conStr);
    var product_id = request.query.product_id;
    var sql1 = "select * from seasoncategory;"
    var sql2 = " select * from marketdata where product_id = ?;";
    var sql3 = " select * from colorcategory;"
    var sql4 = " select * from typecategory;"

    con.query(sql1 + sql2 + sql3 + sql4,[product_id], function(err, results, fields){
        if(err){
            console.log(err);
        }else{
            if(request.session.user == undefined){
                response.render("homepage/market/detail",{
                    record : results,
                    loginUser : {user_name: "undefined"}
                })
            }else{
                response.render("homepage/market/detail",{
                    record : results,
                    loginUser : request.session.user
                    // adminUser:request.session.admin
                })
            }
            // console.log("정보 : ", results[1][0])
            con.end();
        }
    })
})
//마이페이지(회원)
app.get("/homepage/user/mypage",function(request, response){
    var con = mysql.createConnection(conStr);
    var user_No = request.query.user_No;
    var sql = "select * from site_user where user_No=?"

    con.query(sql, [user_No], function(err, result, fields){
        if(err){
            console.log("마이페이지호출에러", err);
        }else{
            // console.log(result)
            response.render("homepage/user/detail",{
                record : result,
                loginUser : request.session.user
            })
        }
        con.end();
    })
})
//마이페이지 수정
app.post("/user/update",function(request,response){
    var con = mysql.createConnection(conStr);
    var user_name = request.body.user_name;
    var user_birthdate = request.body.user_birthdate;
    var user_intro = request.body.user_intro;
    var gender = request.body.gender;
    var age = request.body.age;
    var user_No = request.body.user_No;
    var sql = "update site_user set user_name=?, user_birthdate=?, user_intro=?, gender=?, age =? where user_No=?"
    con.query(sql,[user_name,user_birthdate,user_intro,gender,age,user_No],function(err, fields){
        if(err){
            console.log("마이페이지수정에러",err)
        }else{
            response.redirect("../homepage/main")
        }
        con.end();
    })
})
//장바구니
app.get("/homepage/user/basket",function(request, response){
    var currentPage =1;
    if(request.query.currentPage!=undefined){
        currentPage = request.query.currentPage
    }

    var user_No = request.session.user.user_No;
    var con = mysql.createConnection(conStr);
    var sql = "select * from marketdata m inner join basket b on m.product_id = b.product_id and user_No=? order by b.product_id asc;";
    con.query(sql,[user_No],function(err,result,fields){
        if(err){
            console.log("장바구니불러오기에러", err);
        }else{
            response.render("homepage/user/basket",{
                param : {
                    currentPage : currentPage,
                    record : result
                },
                loginUser : request.session.user
            })
        }
        con.end()
    })
})
//장바구니 등록
app.post("/homepage/market/zzimlist",function(request,response){
    // console.log(request)
    var product_id = request.body.product_id;
    var user_No = request.session.user.user_No;
    var sql = "insert into basket(user_No, product_id) values(?,?)"
    var con = mysql.createConnection(conStr);
    con.query(sql,[user_No,product_id],function(err,fields){
        if(err){
            console.log("장바구니등록에러",err);
        }else{
            response.redirect("/homepage/user/basket")
        }
        con.end();
    })
})
//장바구니 삭제
app.get("/homepage/market/zzimdel",function(request,response){
    console.log(request.query.ch)
    var con = mysql.createConnection(conStr);
    var sql ="delete from basket where basket_id=?"
    var zzim = request.query.ch;
    
    con.query(sql,[zzim],function(err,fields){
        if(err){
            console.log("장바구니삭제오류", err)
        }else{
            response.redirect("/homepage/user/basket")
        }
    })
    
    con.end();
})
app.get("/homepage/market/zzimAlldel",function(request,response){
    console.log(request.query.user_No)
    var con = mysql.createConnection(conStr);
    var sql ="delete from basket where user_No=?"
    var allzzim = request.query.user_No[0];
    
    con.query(sql,[allzzim],function(err,fields){
        if(err){
            console.log("장바구니삭제오류", err)
        }else{
            response.redirect("/homepage/user/basket")
        }
    })
    
    con.end();
})
/*------------------------------------
세션 체크(완벽한것은 아님.. 수정의 여지 ㅇ)
--------------------------------------*/
function checkAdminSession(request, response, url){
    if(request.session.admin){
        response.render(url,{
            adminUser:request.session.admin
        });
    }else{
        response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        response.end(mymodule.getMsgUrl("비정상적인 접근입니다.", "/admin/loginform"))
    }
}

//서버 가동
var server = http.createServer(app);
server.listen(9977, function(){
    console.log("Project server is running at port 9977")
})