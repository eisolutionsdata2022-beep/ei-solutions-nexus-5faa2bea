<?php
require_once('../database/config.php');


if(isset($_REQUEST['api_key']) AND
!empty(filter_var($_REQUEST['vle_id'],FILTER_SANITIZE_STRING))  ){

$api_key = $conn->prepare("select count(*) from loginusers WHERE api_key = ?");
$api_key->execute([$_REQUEST['api_key']]);

$vle_id = $conn->prepare("select count(*) from loginusers WHERE username = ?");
$vle_id->execute([get_safe($_REQUEST['vle_id'])]);

$vleid = $conn->prepare("select * from loginusers WHERE username = ?");
$vleid->execute([get_safe($_REQUEST['vle_id'])]);
$vle_data = $vleid->fetch();

$vleda = $conn->prepare("select * from loginusers WHERE api_key = ?");
$vleda->execute([$_REQUEST['api_key']]);
$vledata = $vleda->fetch();

if($api_key->fetchColumn()==1){
if($vle_id->fetchColumn()==1){
	
	
$url = $gateway_api->botapi_url."/Api/PasswordReset";

$post_data = json_encode([
   "api_key" => $gateway_api->botapi_key, 
   "bot_id" => $gateway_api->botapi_id, 
   "vle_id" => $vle_data['username']
]); 

$results = curl_post_req($url,$post_data);
$response= json_decode($results,true);	
$status = $response['status'];
$message = $response['message'];
if(strtolower($status)=='success'){

$res = array(
"status"=>$status,
"vle_id"=>$vle_data['username'],
"message"=>$message
);	

header('Content-Type: application/json');
echo json_encode($res);	

}else{
$res = array(
"status"=>'FAILED', 
"message"=>$message);

header('Content-Type: application/json');
echo json_encode($res);		
	
}

}else{
$res = array(
"status"=>'FAILED', 
"message"=>'Vle Data Not Exist');

header('Content-Type: application/json');
echo json_encode($res);		
	
}	
	

}else{
$res = array(
"status"=>'FAILED', 
"message"=>'Invalid Api Key');

header('Content-Type: application/json');
echo json_encode($res);		
	
}


	
}else{
$res = array(
"status"=>'FAILED', 
"message"=>'Missing or Invalid Parameter');

header('Content-Type: application/json');
echo json_encode($res);		
	
}


?>