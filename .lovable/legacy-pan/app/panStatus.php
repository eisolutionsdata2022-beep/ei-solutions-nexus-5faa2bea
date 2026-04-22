<?php
require_once('head.php');
if($auth==1){
?>
<div class="container-fluid mt-4"> 
<form action="" method="POST" class="row mt-2">
<div class="col-sm-12 mb-3">
<b class="text-md">Acknowledgement Number</b> 
<input required="required" type="number" class="form-control" placeholder="Acknowledgement Number" name="ack_no">
</div>
<div class="col-md-12 mb-3">
<button class="btn btn-primary bg-primary text-white btn-block" name="track" type="submit">Submit</button>
</div>
<div class="col-md-12 mb-3">
<?php
if(isset($_POST['track']) && !empty($_POST['ack_no'])){
$ack_no = get_safe($_POST['ack_no']); 
require_once('../database/nsdlekyc.function.php'); 
$body = array (
  'api_key' => $auth['apikey'],
  'ack_no' => $ack_no,
);

$payload = json_encode($body, JSON_UNESCAPED_SLASHES);
$curl = curl_init();
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://digtl.in/api/nsdl/pan_status',
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
$pan_status = $response['data']['pan_status'];
$pan = $response['data']['pan'];
if($status=="SUCCESS"){
?>
<div class="card bg-primary text-white p-3">
<h4>Your PAN Application Status :</h4>    
<table class="table mt-4">
    <tr class="text-white"><td>Acknowledgment Number :</td><td><?=$ack_no?></td></tr>
    <tr class="text-white"><td>Application Status :</td><td><small><p><?=strtoupper($pan_status)?></p></small></td></tr>
    <tr class="text-white"><td>Permanent Account Number (PAN) :</td><td><?=!empty($pan) ? strtoupper($pan) : "Processing"?></td></tr>
</table>
</div>
<?php    
}else{
echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> '.$message.'!</div>';   
}
}
?>
</div>
</form>
</div>
<?php
}
require_once('foot.php');
?>
