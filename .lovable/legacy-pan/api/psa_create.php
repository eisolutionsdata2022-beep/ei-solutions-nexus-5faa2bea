<?php
require_once('../database/config.php');
try{
if(isset($_REQUEST['api_key']) AND
!empty(filter_var($_REQUEST['vle_id'],FILTER_SANITIZE_STRING))  AND
!empty(filter_var($_REQUEST['vle_name'],FILTER_SANITIZE_STRING))  AND
!empty(filter_var($_REQUEST['vle_mob'],FILTER_SANITIZE_NUMBER_INT))  AND
!empty(filter_var($_REQUEST['vle_email'],FILTER_SANITIZE_EMAIL))  AND
!empty(filter_var($_REQUEST['vle_shop'],FILTER_SANITIZE_STRING))  AND
!empty(filter_var($_REQUEST['vle_loc'],FILTER_SANITIZE_STRING))  AND
!empty(filter_var($_REQUEST['vle_state'],FILTER_SANITIZE_NUMBER_INT))  AND
!empty(filter_var($_REQUEST['vle_pin'],FILTER_SANITIZE_NUMBER_INT))  AND
!empty(filter_var($_REQUEST['vle_uid'],FILTER_SANITIZE_NUMBER_INT)) AND
!empty(filter_var($_REQUEST['vle_pan'],FILTER_SANITIZE_STRING))   ){

$msql = $conn->prepare("select * from settings WHERE id = ?");
$msql->execute(['1']);
$mw_data=$msql->fetch();

$gateway_api = json_decode($mw_data['gateway_api']); 
$datetime =date('d-M-Y h:i:s A', time());


$api_key = $conn->prepare("select count(*) from loginusers WHERE api_key = ?");
$api_key->execute([$_REQUEST['api_key']]);

$vle_id = $conn->prepare("select count(*) from loginusers WHERE username = ?");
$vle_id->execute([$_REQUEST['vle_id']]);

$vle_mob = $conn->prepare("select count(*) from loginusers WHERE mobile_no = ?");
$vle_mob->execute([$_REQUEST['vle_mob']]);

$vle_email = $conn->prepare("select count(*) from loginusers WHERE email_id = ?");
$vle_email->execute([$_REQUEST['vle_email']]);

$vle_uid = $conn->prepare("select count(*) from loginusers WHERE uid_no = ?");
$vle_uid->execute([$_REQUEST['vle_uid']]);

$vle_pan = $conn->prepare("select count(*) from loginusers WHERE pan_no = ?");
$vle_pan->execute([$_REQUEST['vle_pan']]);

$vleda = $conn->prepare("select * from loginusers WHERE api_key = ?");
$vleda->execute([$_REQUEST['api_key']]);
$vledata = $vleda->fetch();

if($api_key->fetchColumn()==1){
    
if(strlen($_REQUEST['vle_loc'])<50){  

if($vle_id->fetchColumn()==0){
    

$sql = "INSERT INTO loginusers(username, owner_name, shop_name, mobile_no, email_id, pan_no, uid_no, address, state, pin_code, usertype, createby, date_time, status, is_apiuser) 
VALUES (:username,:owner_name,:shop_name,:mobile_no,:email_id,:pan_no,:uid_no,:address,:state,:pin_code,:usertype,:createby,:date_time,:status,:is_apiuser)";
$status = "pending";	
$usertype = 'retailer';
$is_apiuser = '1';
$stmt = $conn->prepare($sql);
$stmt->bindParam(":username", get_safe($_REQUEST['vle_id'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":owner_name", get_safe($_REQUEST['vle_name'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":shop_name", get_safe($_REQUEST['vle_shop'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":mobile_no", get_safe($_REQUEST['vle_mob'],FILTER_SANITIZE_NUMBER_INT));
$stmt->bindParam(":email_id", get_safe($_REQUEST['vle_email'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":pan_no", get_safe($_REQUEST['vle_pan'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":uid_no", get_safe($_REQUEST['vle_uid'],FILTER_SANITIZE_NUMBER_INT));
$stmt->bindParam(":address", get_safe($_REQUEST['vle_loc'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":state", get_safe($_REQUEST['vle_state'],FILTER_SANITIZE_STRING));
$stmt->bindParam(":pin_code", get_safe($_REQUEST['vle_pin'],FILTER_SANITIZE_NUMBER_INT));
$stmt->bindParam(":usertype", $usertype);
$stmt->bindParam(":createby", $vledata['username']);
$stmt->bindParam(":date_time", $datetime);
$stmt->bindParam(":status", $status);
$stmt->bindParam(":is_apiuser", $is_apiuser);
if($stmt->execute()){
$id = $conn->lastInsertId();


$res = array(
"status"=>'SUCCESS', 
"message"=>'Vle Create Successfully', 
"vle_id"=>$_REQUEST['vle_id'],
"vle_status"=>'PENDING');


$url = $gateway_api->botapi_url."/Api/PSACreate";

$post_data = json_encode([
   "api_key" => $gateway_api->botapi_key, 
   "bot_id" => $gateway_api->botapi_id, 
   "vleid" => $_REQUEST['vle_id'], 
   "vlename" => $_REQUEST['vle_shop'],
   "contactperson" => $_REQUEST['vle_name'],
   "address1" => $_REQUEST['vle_loc'],
   "address2" => $_REQUEST['vle_loc'],
   "address3" => $_REQUEST['vle_loc'],
   "address4" => $_REQUEST['vle_loc'],
   "location" => $_REQUEST['vle_loc'],
   "state" => $_REQUEST['vle_state'],
   "district" => "OTHER",
   "pincode" => $_REQUEST['vle_pin'],
   "email" => $_REQUEST['vle_email'],
   "mobile" => $_REQUEST['vle_mob'],
   "pan" => $_REQUEST['vle_pan']
]); 

$results = curl_post_req($url,$post_data);
$response= json_decode($results,true);	
$status = $response['status'];
$message = $response['message'];
if(strtolower($status)=='success'){
$sql = $conn->prepare("UPDATE loginusers SET status='approved', vle_id='".$userid."' WHERE id='$id' ");
$sql->execute();    

$res = array(
"status"=>'SUCCESS', 
"message"=>$message, 
"vle_id"=>$_REQUEST['vle_id'],
"vle_status"=>'SUCCESS');

}

header('Content-Type: application/json');
echo json_encode($res);	
}else{
$res = array(
"status"=>'FAILED', 
"message"=>'Internal Server Error');

header('Content-Type: application/json');
echo json_encode($res);		
	
}

	
	
}else{
$res = array(
"status"=>'FAILED', 
"message"=>'Vle Data Already Exist');

header('Content-Type: application/json');
echo json_encode($res);		
	
}	
	
}else{
$res = array(
"status"=>'FAILED', 
"message"=>'vle_loc, Maximum 25 characters allowed');

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

 }
catch(PDOException $e)
    {
    echo "Error: " . $e->getMessage();
    }
	

?>