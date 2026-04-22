<?php
if(isset($_GET['nsdl_ekyc_redirect'])){
require_once('../database/config.php');    
$x_authorization = $_GET['nsdl_ekyc_redirect'];
$x_type = $_GET['type'];
redirect(0,"https://sso-nsdl-ekyc-app.pages.dev/sso_nsdl_ekyc_redirect?type=$x_type&authorization=$x_authorization");
exit("Please Do Not Refresh This Page. Redirect To NSDL.......");
}

if(isset($_POST['panapply']) 
&& !empty($_POST['name']) 
&& !empty($_POST['dob']) 
&& !empty($_POST['gender']) 
&& !empty($_POST['mobile']) 
&& !empty($_POST['email']) 
){

$app_token = strip_tags($_GET['app_token']); 
require_once('../database/config.php');
$usql = $conn->prepare("select * from loginusers WHERE app_token = ?");
$usql->execute([$app_token]);
$userdata=$usql->fetch();

$application_mode = get_safe($_POST['application_mode']);
$application_type = get_safe($_POST['application_type']);
$name = get_safe($_POST['name']);
$dob = get_safe($_POST['dob']);
$gender = get_safe($_POST['gender']);
$mobile = get_safe($_POST['mobile']);
$email = get_safe($_POST['email']);


if($userdata['nsdl_active']=='YES' && $userdata['p_nsdl']>=96){
    
if($userdata['balance']>=$userdata['p_nsdl']){    
$amount = get_safe($userdata['p_nsdl']);
$orderId = 'EKYC'.$order_id.'A'.$userdata['id']; 
// Debit
$new_bal = $userdata['balance'] - $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$new_bal,$userdata['id']]);
// Debit

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'NSDLPAN';	
$type = 'debit';
$remark = 'NSDL EKYC PAN: '.$name.' - '.$mobile;
$status = 'success';
$reference = $orderId;
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
  
$txnsql = "INSERT INTO `ekycpancard`(`web_url`, `user_id`, username, `date_time`, `order_id`, `type`, name, dob, gender, mobile, email, `amount`,`old_balance`, `new_balance`, `status`)
 VALUES (:web_url,:user_id,:username,:date_time,:order_id,'P',:name, :dob, :gender, :mobile, :email, :amount,:old_balance,:new_balance,:status)";
$status = 'Pending';
$reference = $orderId;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":web_url", $_SERVER['SERVER_NAME']);
$txn->bindParam(":user_id", $userdata['id']);
$txn->bindParam(":username", $userdata['username']);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":order_id", $orderId);
$txn->bindParam(":name", $name);
$txn->bindParam(":dob", date("d/m/Y",strtotime($dob)));
$txn->bindParam(":gender", $gender);
$txn->bindParam(":mobile", $mobile);
$txn->bindParam(":email", $email);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":old_balance", $userdata['balance']);
$txn->bindParam(":new_balance", $new_bal);
$txn->bindParam(":status", $status);  
if($txn->execute()){
    
require_once('../database/nsdlekyc.function.php');  
$body = array (
  'api_key' => $auth['apikey'],
  'application_mode'=>  $application_mode,
  'application_type' => $application_type,
  'category' => 'P',
  'name' => $name,
  'dob' => date("d/m/Y",strtotime($dob)),
  'gender' => $gender,
  'mobile' => $mobile,
  'email' => $email,
  'is_physical_pan_required' => 'Y',
  'consent' => 'Y',
  'redirect_url' => $socket.$_SERVER['SERVER_NAME']."/app/ekycpanNsdl",
  'p_order_id' => $orderId,
);

$payload = json_encode($body, JSON_UNESCAPED_SLASHES);
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://utibot.in/api/nsdl/get_authorization',
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
$status = $response['status'];
$message = $response['message'];
$ref_id = $response['data']['order_id'];
$authorization = $response['data']['authorization'];

$conn->query("UPDATE ekycpancard SET response='".json_encode($response)."', ref_id='".$ref_id."' WHERE order_id='".$orderId."' ");
if($status=="SUCCESS"){
$result = array("status"=>true,"msg"=>"Transaction Successful","redirect"=>$socket.$_SERVER['SERVER_NAME']."/app/ekycpanNsdl?nsdl_ekyc_redirect=$authorization&type=$application_type","authorization"=>$authorization);
}else{
    
// Debit
$newBal = $new_bal + $amount;
// Debit

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `orderid`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:orderid,:remark,:status)";
$mode = 'NSDLPAN';	
$type = 'credit';
$remark = 'NSDL EKYC PAN REFUND: '.$name.' - '.$mobile;
$status = 'success';
$reference = $orderId;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $newBal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":orderid", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$newBal,$userdata['id']]);
$sqlu = $conn->prepare("UPDATE ekycpancard SET status='Failed', remark='".$message."' WHERE order_id='".$orderId."' ");
$sqlu->execute();
$result = array("status"=>false,"msg"=>"Authorization Failed, $message"); 
}else{
$result = array("status"=>false,"msg"=>$message);    
}
   
}
    
}else{
$result = array("status"=>false,"msg"=>"PAN Service Is Down");    
}
    
}else{
$result = array("status"=>false,"msg"=>"Wallet Service Is Down");    
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


// Callback
if(isset($_GET['encrypted_data'])){
echo '
  <script src="../bootstrap/js/historry.js"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
  <script src="https://unpkg.com/sweetalert/dist/sweetalert.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
  <div class="col-md-6 text-center mt-4">
  ';    
require_once('../database/config.php'); 
require_once('../database/nsdlekyc.function.php'); 

$decodeData = base64_decode($_GET['encrypted_data']);
$response = json_decode($decodeData,true);
$encrypted_data = encrypt($decodeData, $auth['encryption_key']);
$response = decrypt($encrypted_data, $auth['encryption_key']);
$response = json_decode($response,true);

$status = $response['status'];
$message = $response['message'];
$error_message = $response['data']['error_message'];
$ack_no = $response['data']['ack_no'];
$ref_id = $response['data']['p_order_id'];
$sql = $conn->prepare("select * from ekycpancard WHERE ref_id = ?");
$sql->execute([$ref_id]);
$ekycpancardData = $sql->fetch();
if($ekycpancardData['id']>0 && $ekycpancardData['status']=="Pending"){

$orderId = $ekycpancardData['order_id'];
$userid = explode("A",$orderId)[1];
$usql = $conn->prepare("select * from loginusers WHERE id ='".$userid."' ");
$usql->execute();
$userdata=$usql->fetch();


$sqlu = $conn->prepare("UPDATE ekycpancard SET response='".json_encode($response)."' WHERE order_id='".$orderId."' ");
$sqlu->execute();
//$status="SUCCESS";
if($status=="SUCCESS"){
$sql = $conn->prepare("select * from ekycpancard WHERE order_id = ?");
$sql->execute([$orderId]);
$ekycpancardData=$sql->fetch();  

if($ekycpancardData['status']=="Pending"){

$sqlu = $conn->prepare("UPDATE ekycpancard SET encrypted_data='".$encrypted_data."', ack_no='".$ack_no."', remark='".$message."', status='Success' WHERE id='".$ekycpancardData['id']."' ");
if($sqlu->execute()){

$usr_d=$userdata;

$disql = $conn->prepare("select * from loginusers WHERE username = ?");
$disql->execute([$usr_d['createby']]);
$dis_data=$disql->fetch();

$susql = $conn->prepare("select * from loginusers WHERE username = ?");
$susql->execute([$dis_data['createby']]);
$sup_data=$susql->fetch();

$wlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$wlsql->execute([$sup_data['createby']]);
$wl_data=$wlsql->fetch();

$mwlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$mwlsql->execute([$wl_data['createby']]);
$mwl_data=$mwlsql->fetch();

$cup_type = "p_nsdl";

if($dis_data['id']>0){
$rcom = $usr_d[$cup_type] - $dis_data[$cup_type];	
$tcom = $rcom;
$total_credit = $dis_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$dis_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $dis_data['username']);
$txn->bindParam(":bank", $usr_d['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();
}

if($sup_data['id']>0){
$rcom = $dis_data[$cup_type] - $sup_data[$cup_type];	
$tcom = $rcom;
$total_credit = $sup_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$sup_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $sup_data['username']);
$txn->bindParam(":bank", $dis_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}

if($wl_data['id']>0){
$rcom = $sup_data[$cup_type] - $wl_data[$cup_type];	
$tcom = $rcom;
$total_credit = $wl_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$wl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $wl_data['username']);
$txn->bindParam(":bank", $sup_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}

if($mwl_data['id']>0){
$rcom = $wl_data[$cup_type] - $mwl_data[$cup_type];	
$tcom = $rcom;
$total_credit = $mwl_data['balance'] + $tcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$mwl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $mwl_data['username']);
$txn->bindParam(":bank", $wl_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$tcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();	
}

}

}
?> 
<div class="ackcontent"> 
<div class="card bg-primary text-white" style="padding: 10px;">
    <h5 class="text-white" style="font-size: 16px; font-weight: 600;">Online PAN Acknowledgement</h5>
    <hr>
    <div class="contact-form">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="text-white">
            <tbody>
                <tr>
                    <td width="33%" height="30">Application Type</td>
                    <td width="1%" height="30" align="center">:</td>
                    <td width="66%" height="30">PAN - Indian Citizen (Form 49A)</td>
                </tr>
                <tr>
                    <td height="30">Category</td>
                    <td align="center" height="30">:</td>
                    <td height="30">INDIVIDUAL</td>
                </tr>
                <tr>
                    <td height="30">Name</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['name'])?></td>
                </tr>
                <tr>
                    <td height="30">Date of Birth</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['dob'])?></td>
                </tr>
                <tr>
                    <td height="30">Mobile</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['mobile'])?></td>
                </tr>
                <tr>
                    <td height="30">Email</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['email'])?></td>
                </tr>
                <tr>
                    <td height="30">Amount</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['amount'])?></td>
                </tr>
                <tr>
                    <td height="30">Agent ID</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($userdata['username'])?></td>
                </tr>

                <tr>
                    <td height="30">Order ID</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['order_id'])?></td>
                </tr>

                <tr>
                    <td height="30">Ack No</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['ack_no'])?></td>
                </tr>

                <tr>
                    <td height="30">Date Time</td>
                    <td align="center" height="30">:</td>
                    <td height="30"><?=strtoupper($ekycpancardData['date_time'])?></td>
                </tr>

            </tbody>
        </table>
    </div>
</div>
</div>

<button onclick="CreatePDFfromHTML('.ackcontent','<?=strtoupper($ekycpancardData['order_id'])?>')" class="btn btn-success mt-4">Download PDF</button>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js"></script>
<script type="text/javascript" src="https://html2canvas.hertzen.com/dist/html2canvas.js"></script>
<script>
function CreatePDFfromHTML(elm,filename) {
    var HTML_Width = 380;
    var HTML_Height = 250;
    var top_left_margin = 15;
    var PDF_Width = HTML_Width + (top_left_margin * 2);
    var PDF_Height = (PDF_Width * 1.5) + (top_left_margin * 2);
    var canvas_image_width = HTML_Width;
    var canvas_image_height = HTML_Height;

    var totalPDFPages = Math.ceil(HTML_Height / PDF_Height) - 1;

    html2canvas($(elm)[0]).then(function (canvas) {
        var imgData = canvas.toDataURL("image/jpeg", 1.0);
        var pdf = new jsPDF('p', 'pt', [PDF_Width, PDF_Height]);
        pdf.addImage(imgData, 'JPG', top_left_margin, top_left_margin, canvas_image_width, canvas_image_height);
        for (var i = 1; i <= totalPDFPages; i++) { 
            pdf.addPage(PDF_Width, PDF_Height);
            pdf.addImage(imgData, 'JPG', top_left_margin, -(PDF_Height*i)+(top_left_margin*4),canvas_image_width,canvas_image_height);
        }
        pdf.save(filename+".pdf");
        //$(".html-content").hide();
    });
}    
</script>
<?php 
}else if($status=="FAILED"){
$sql = $conn->prepare("select * from ekycpancard WHERE order_id = ? and status='Pending' ");
$sql->execute([$orderId]);
$ekycpancardData=$sql->fetch();
if(count($ekycpancardData)>0 && $ekycpancardData['id']>0 && $ekycpancardData['order_id']==$orderId && $ekycpancardData['status']=="Pending"){
$amount =  $ekycpancardData['amount'];   
// Debit
$newBal = $userdata['balance'] + $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$newBal,$userdata['id']]);
// Debit

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'NSDLPAN';	
$type = 'credit';
$remark = "NSDL EKYC PAN REFUND: $error_message";
$status = 'success';
$reference = $orderId;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $newBal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
$sqlu = $conn->prepare("UPDATE ekycpancard SET status='Failed', remark='".$message."' WHERE id='".$ekycpancardData['id']."' ");
$sqlu->execute();
echo '<script>AndroidInterface.showToast("'.$error_message.'");</script>';
}else{
echo '<script>AndroidInterface.showToast("Server is Down");</script>';
}

}else{
echo '<script>AndroidInterface.showToast("Data Not Found");</script>';
}

}else{
echo '<script>AndroidInterface.showToast("'.$message.'!");</script>';
}

redirect(0,$socket.$_SERVER['SERVER_NAME']."/app/ekycpanNsdl?app_token=".$userdata['app_token']);
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Order ID Not Found!</div>';   
echo '<script>AndroidInterface.showToast("Order ID Not Found");</script>';
}

echo "</div>";
exit();
}

require_once('head.php');
if($auth==1){
?>





<!-- Begin Page Content -->

<?php if($userdata['nsdl_active']=='YES' && $userdata['p_nsdl']>=96){ ?>

   <div class="container-fluid mt-4">  
   <!-- DataTales Example -->
          <div class="mb-4">
            <div>
			<div class='row'>
			<div class='col-md-6'>
			       

<form action="" method="post" class="contact-page-form style-01" id="applyPan" onsubmit="return false">
    <div class="row">
    <div class="col-md-12 mb-2">
        <div class="form-group">
              <select class="form-control" name="application_mode" required="" aria-required="true" style="background: white;">
                <option value="">Select Application Mode</option>
                <option value="EKYC">EKYC - Instant PAN</option>
                <option value="ESIGN">ESIGN - Scan Based PAN</option>
            </select>
        </div>
    </div>

    <div class="col-md-12 mb-2">
        <div class="form-group">
              <select class="form-control" name="application_type" id="application_type" required="" aria-required="true" style="background: white;">
                <option value="">Select Application Type</option>
                <option value="49A">New PAN (Form 49A)</option>
                <option value="CR">Correction PAN (Form CSF)</option>
            </select>
        </div>
    </div>
    
    <div class="col-md-12 mb-2">
        <div class="form-group">
            <input type="text" name="name" placeholder="Name (As in Aadhaar Card)" class="form-control" required="" aria-required="true" autocomplete="off" />
        </div>
    </div>

    <div class="col-md-12">
        <div class="form-group">
            <b>Date Of Birth</b>
            <input class="form-control" type="date" dateformat="d/m/Y" placeholder="DD/MM/YYYY" name="dob" pattern="[0-9]{2}\/[0-9]{2}\/(19|20)\d{2}$" maxlength="10" required/>
        </div>
    </div>


    <div class="col-md-12">
        <div class="form-group">
            <select class="form-control" name="gender" required="" aria-required="true"  style="background: white;">
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
            </select>
        </div>
    </div>
    
    <div class="col-md-12">
        <div class="form-group">
            <input type="number" name="mobile" placeholder="Mobile Number" maxlength="10" class="form-control" onKeyPress="if(this.value.length==10) return false;" required="" aria-required="true" autocomplete="off" />
        </div>
    </div>

    <div class="col-md-12">
        <div class="form-group">
            <input type="text" name="email" placeholder="Email Address" class="form-control" required="" aria-required="true" autocomplete="off" />
         </div>
    </div>

    <div class="col-sm-12 mb-2 px-5">
        <input type="checkbox" name="agree" value="Y" class="form-check-input" required=""/>&nbsp;
        <small>I (Consumer ) hereby state that I have no objection in authenticating myself with Aadhaar based UID/VID authentication system and provide my consent for the same.</small>
    </div>

    
    <div class="col-md-12 mb-2 text-center">
        <label class="text-danger">Application Charge is Rs.<?=$userdata['p_nsdl']?></label>
        <div class="btn-wrapper mt-2">
            <input type="submit" id="submitBtn" value="Submit" class="btn btn-primary btn-lg btn-block" onclick="return confirm('Are you sure?')" />
        </div>
    </div>
    
    </div>
</form>

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
             openNSDLApp(response.authorization,$("#application_type").val());
            }else{
             AndroidInterface.showToast(response.msg);
            }
        } 
    });
});    


function openNSDLApp(authorization,type) {
    AndroidInterface.runNsdlApp(authorization,type);
}


function checkDriver() {
    AndroidInterface.checkDriver();
}

$(document).ready(function(){
   checkDriver();
});
</script>

				 
</div>
</div>
</div>
</div>
</div>				 
<?php }else{ ?>   
<?php
if(isset($_GET['active']) && $_GET['active']==true){
    
if($userdata['balance']>=$webdata['nsdl_rt']){
$amount = $webdata['nsdl_rt']; 
// Debit
$new_bal = $userdata['balance'] - $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?, nsdl_active=?  WHERE id=?");
$sqlu->execute([$new_bal,"YES",$userdata['id']]);
// Debit

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
    
$disql = $conn->prepare("select * from loginusers WHERE username = ?");
$disql->execute([$userdata['createby']]);
$dis_data=$disql->fetch();

$susql = $conn->prepare("select * from loginusers WHERE username = ?");
$susql->execute([$dis_data['createby']]);
$sup_data=$susql->fetch();

$wlsql = $conn->prepare("select * from loginusers WHERE id = ?");
$wlsql->execute([$webdata['users']]);
$wl_data=$wlsql->fetch();    

if($dis_data['id']==$wl_data['id'] && $dis_data['usertype']=="wluser"){

 
$downCommission = $webdata['nsdl_ad']+$webdata['nsdl_md'];    
$myCommission = $webdata['nsdl_rt']-$wl_data['nsdl_id_charge']; 
 
$totalCommission = $myCommission; 

if($totalCommission>0 && $wl_data['id']>0){
    
$amt = $totalCommission;    
$total_credit = $wl_data['balance'] + $amt;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$wl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'Purchase NSDL e-KYC PAN Service: Rs.'.$amt.' Commission Credit';
$status = 'success';
$reference = 'NSDL'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $wl_data['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amt);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();      
   
}
    
    
}else{

if($webdata['nsdl_ad']>0 && $dis_data['id']>0){

$amt = $webdata['nsdl_ad'];    
$total_credit = $dis_data['balance'] + $amt;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$dis_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'Purchase NSDL e-KYC PAN Service: Rs.'.$amt.' Commission Credit';
$status = 'success';
$reference = 'NSDL'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $dis_data['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amt);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();    
    
    
}



if($webdata['nsdl_md']>0 && $sup_data['id']>0){

$amt = $webdata['nsdl_md'];    
$total_credit = $sup_data['balance'] + $amt;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$sup_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'Purchase NSDL e-KYC PAN Service: Rs.'.$amt.' Commission Credit';
$status = 'success';
$reference = 'NSDL'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $sup_data['username']);
$txn->bindParam(":bank", $dis_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amt);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();    
} 
 
 
 
$downCommission = $webdata['nsdl_ad']+$webdata['nsdl_md'];    
$myCommission = $webdata['nsdl_rt']-$wl_data['nsdl_id_charge']; 
 
$totalCommission = $myCommission - $downCommission; 

if($totalCommission>0 && $wl_data['id']>0){
    
$amt = $totalCommission;    
$total_credit = $wl_data['balance'] + $amt;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$wl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'Purchase NSDL e-KYC PAN Service: Rs.'.$amt.' Commission Credit';
$status = 'success';
$reference = 'NSDL'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $wl_data['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amt);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();      
   
} 
 
} 

 
echo '<div class="alert alert-success" role="alert">
<strong>Congratulations!</strong> Service Successfully Activated!</div>';    
redirect(1500,"");    
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Service is Down!</div>';      
}
 
 
    
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Wallet!</strong> Insufficient Balance! First Add Rs.'.$webdata['nsdl_rt'].' To Your Wallet. <a href="addmoneyupiauto.php" class="text-white"><b>Click Here</b></a></div>';      
}    
    
}
?>

<div class='mt-2 text-center'>
<h3 class="text-danger"><b>NSDL Paperless PAN OTP/Biometric Through PAN Apply.</b></h3>
<div><img src="../bootstrap/img/credit-score-01.png" width="300px"></div>
<button class="btn btn-success mb-2" onclick="activeService()">Active This Service</button><br>
<span class="text-danger"><b>Note: Service Activation Charges Rs.<?=$webdata['nsdl_rt']?> Only, Amount Will Be Debit From Your Wallet.</b></span>
</div>
<script>
function activeService(){
    if(confirm("Are Your Sure?")){
        location.href = "?app_token=<?=$userdata['app_token']?>&active=true";
    }
}    
</script>



<?php } ?> 
 
<?php
}
require_once('foot.php');
?>
