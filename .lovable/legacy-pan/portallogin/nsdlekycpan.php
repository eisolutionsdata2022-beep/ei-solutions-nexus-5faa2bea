<?php
session_start();
session_regenerate_id();    
require_once('../database/config.php');
$usql = $conn->prepare("select * from loginusers WHERE username = ?");
$usql->execute([$_SESSION['username']]);
$userdata=$usql->fetch();?>
<?php
if(isset($_GET['nsdl_ekyc_redirect'])){
//require_once('../database/config.php');    
$x_authorization = $_GET['nsdl_ekyc_redirect'];
$x_type = $_GET['type'];
?>
<center><h1>Please do not refresh this page.Redirect To NSDL.......</h1></center>
<form name="f1" action="https://digipaydashboard.religaredigital.in/Login/Authenticate" method="Post"> <input type="hidden" name="authentication"
value="<?php echo $x_authorization; ?>"> </form>
<script type="text/javascript">
			 document.f1.submit();
		</script>
		<?php
//redirect(0,"https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect?type=$x_type&authorization=$x_authorization");
//exit("Please Do Not Refresh This Page. Redirect To NSDL.......");
}

if(isset($_POST['panapply']) 
){
 



/*$application_mode = get_safe($_POST['application_mode']);
$application_type = get_safe($_POST['application_type']);
$name = get_safe($_POST['name']);
$dob = get_safe($_POST['dob']);
$gender = get_safe($_POST['gender']);
$mobile = get_safe($_POST['mobile']);
$email = get_safe($_POST['email']);*/


if($userdata['nsdl_active']=='YES' && $userdata['p_nsdl']>=95){
    if($userdata['nsdl_id']==''){
        $udr = $conn->prepare("SELECT * FROM `nsdl_ids` WHERE `userid` = ? ORDER BY `id` DESC");
    $udr->execute([$userdata['username']]);
    $udrr = $udr->fetch();
    if($udrr['userid']==$userdata['username']){
        $nsdl_id=$userdata['username'];
    }else{
    
        $ud = $conn->prepare("SELECT * FROM `nsdl_ids` WHERE `status` = ? ORDER BY `id` DESC");
    $ud->execute(['inactive']);
    $udr = $ud->fetch();
    $nsdl_id=$udr['userid'];
    }
    $sqlur = $conn->prepare("UPDATE loginusers SET nsdl_id=?  WHERE id=?");
$sqlur->execute([$nsdl_id,$userdata['id']]);
$sqlupr = $conn->prepare("UPDATE nsdl_ids SET status=?  WHERE userid=?");
$sqlupr->execute(['active',$nsdl_id]);
    }
    
if($userdata['balance']>=$userdata['p_nsdl']){    
$amount = get_safe($userdata['p_nsdl']);
$orderId = 'EKYC'.$order_id; 
// Debit

    
$webname =  $_SERVER['SERVER_NAME']; 
$body = array (
  'api_key' =>"017167-daff11-455b0e-8d571e-0ee9ff",
  'redirect_url' => $socket.$_SERVER['SERVER_NAME']."/portallogin/nsdlekycpan",
  'userId' => $userdata['nsdl_id'],
  'orderId' => $orderId,
  'weburl'=>$webname,
  'shop_name'=>$userdata['shop_name'],
);

$payload = json_encode($body, JSON_UNESCAPED_SLASHES);
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://mallikarecharge.in/portallogin/nsdlAuth',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>$payload,
));
$response = curl_exec($curl);
curl_close($curl);
$response = json_decode($response,true);
$statusCode = $response['StatusCode'];
$status = $response['Status'];
$message = $response['Message'];
$ref_id = $response['OrderId'];
$authorization = $response['Authorization'];

$conn->query("UPDATE ekycpancard SET response='".json_encode($response)."', `remark`='".$response['Message']."' WHERE id='1' ");

if($statusCode=="1"){
   $result = array("status"=>true,"msg"=>"Transaction Successful","redirect"=>$socket.$_SERVER['SERVER_NAME']."/portallogin/nsdlekycpan?nsdl_ekyc_redirect=$authorization&type=$application_type");
}else{

$result = array("status"=>false,"msg"=>"Authorization Failed,$message");    
}

}else{
$result = array("status"=>false,"msg"=>"Insufficient Balance");    
}


}else{
$result = array("status"=>false,"msg"=>"Unauthorized Access");    
}

header("Content-Type: application/json");
echo json_encode($result);
exit();
}


require_once('../database/header.php');
if($userdata['status']=='paywait'){
echo '<script>
window.location = "paywait.php"
</script>
';	
}
if(isset($_GET['active']) && $_GET['active']==true){
    if($userdata['balance']>=$userdata['nsdl_id_charge']){
    $amount = $userdata['nsdl_id_charge']; 
    $new_bal = $userdata['balance'] - $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?, nsdl_active=?  WHERE id=?");
$sqlu->execute([$new_bal,"YES",$userdata['id']]);
$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'NSDL';	
$type = 'debit';
$remark = 'Purchase NSDL e-KYC PAN Service: '.$userdata['username'].' - '.$userdata['owner_name'];
$status = 'success';
$reference = 'NSDL'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $new_bal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    echo '<div class="alert alert-success" role="alert">
<strong>Congratulations!</strong> Service Successfully Activated!</div>';    
redirect(1500,"nsdlekycpan"); 
}else{
    echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Service is Down!</div>';      
}
}
    
}

?>


<?php

 
 if($userdata['nsdl_active']=='YES'){
     
?>
<div class='col-md-6 text-center'>
<img src="../bootstrap/img/credit-score-01.png" width="300px">
</div>
<div class='col-md-5'>
<form action="" method="post" class="contact-page-form style-01" id="applyPan" onsubmit="return false">
    <div class="row">

    <div class="col-sm-12 form-group margin-0 padding-0  mb-2">
        <small><b>
            <input type="checkbox" name="agree" value="Y" class="form-check-input" required=""/>&nbsp;
             I (Consumer ) hereby state that I have no objection in authenticating myself with Aadhaar based UID/VID authentication system and provide my consent for the same.
        </b></small>
    </div>

    
    <div class="col-md-12 mb-2 text-center">
        <label class="text-danger">Application Charge is Rs.<?=$userdata['p_nsdl'];?></label>
        <div class="btn-wrapper mt-2">
            <input type="submit" id="submitBtn" target="blank" value="Submit" class="btn btn-primary btn-lg btn-block" onclick="return confirm('Are you sure?')" />
        </div>
    </div>
    
    </div>
</form>

<?php 
}else{
    
    if($userdata['balance']>=$userdata['nsdl_id_charge']){
          
?>
<div class='col-md-6 text-center'>
<h3 class="text-danger"><b>NSDL Paperless PAN OTP/Biometric Through PAN Apply.</b></h3>
<div><img src="../bootstrap/img/credit-score-01.png" width="300px"></div>
<button class="btn btn-success mb-2" onclick="activeService()">Active This Service</button><br>
<span class="text-danger"><b>Note: Service Activation Charges Rs.<?php echo $userdata['nsdl_id_charge'];?> Only, Amount Will Be Debit From Your Wallet.</b></span>
</div>
<script>
function activeService(){
    if(confirm("Are Your Sure?")){
        location.href = "?active=true";
    }
}    
</script>
<?php

}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Wallet!</strong> Insufficient Balance! First Add Rs.'.$userdata['nsdl_id_charge'].' To Your Wallet. <a href="instantaddmoney" class="text-white"><b>Click Here</b></a></div>';    
}
/*}else{
echo 'hghg';
}*/
}
?>
<script src="../bootstrap/vendor/jquery/jquery.min.js"></script>
<script>
$("#applyPan").submit(function(e) {
    e.preventDefault();
    $("#submitBtn").val('Processing......');
    $.ajax({
        url: location.href,
        method: 'POST',
        data: $(this).serialize()+"&panapply=true",
        success: function(response){
         $("#submitBtn").val('Submit');
            console.log(response);
            if(response.status==true){
              location.href = response.redirect;  
            }else{
             alert(response.msg);    
            }
        } 
    });
});    
</script>

</div>

</div>
</div>
</div>

</div>
<!-- /.container-fluid -->
<!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>